"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Download, FileSignature, Fingerprint, ShieldCheck } from "lucide-react";
import { leerPlazo } from "@/lib/habiles";
import { DENUNCIA } from "@/lib/ley";
import { nombreRequisito } from "@/lib/observatorio";
import type { Hallazgo } from "@/lib/veredictos";
import type { Tramite } from "@/lib/tipos";

const salida = [0.16, 1, 0.3, 1] as const;
const hoy = () => new Date().toLocaleDateString("en-CA");
const campo =
  "mt-1.5 w-full rounded-[10px] border-2 border-linea bg-panel px-3 py-2.5 text-base leading-snug transition-colors duration-150 placeholder:text-tinta-suave focus:border-tinta";

type Listo = { pdf: string; ots: string | null; huella: string; sellado: string | null; calendario: string | null; nombre: string };

async function huellaDe(bytes: Uint8Array) {
  const digesto = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digesto)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// "15 días el plazo de 15 días hábiles es para..." se escribe como "15 días hábiles".
function plazoLegible(texto: string) {
  const p = leerPlazo(texto);
  if (!p) return texto.split(/\s(?=el plazo|a partir)/i)[0];
  return `${p.dias} ${p.dias === 1 ? "día" : "días"}${p.habiles ? (p.dias === 1 ? " hábil" : " hábiles") : " naturales"}`;
}

const urlDe =(datos: BlobPart, tipo: string) => URL.createObjectURL(new Blob([datos], { type: tipo }));

// Convierte lo que no cuadró en el escrito que pide la Contraloría, sellado en el tiempo. Todo se arma en el teléfono.
export function PrepararDenuncia({ tramite, hallazgos }: { tramite: Tramite; hallazgos: Hallazgo[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"libre" | "armando">("libre");
  const [error, setError] = useState("");
  const [listo, setListo] = useState<Listo | null>(null);
  const oficinaInicial = tramite.oficinas?.[0] ? `${tramite.oficinas[0].nombre}, ${tramite.oficinas[0].direccion}` : tramite.domicilio;
  const [f, setF] = useState({ fecha: hoy(), hora: "", oficina: oficinaInicial, quien: "", extra: "", testigos: "", nombre: "", contacto: "", protesta: false });
  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.protesta) {
      setError("Para presentar la denuncia tienes que declarar que los hechos son ciertos.");
      return;
    }
    setEstado("armando");
    setError("");
    try {
      const { generarEscrito } = await import("@/lib/escrito-denuncia");
      const bytes = await generarEscrito({
        tramite: {
          clave: tramite.clave,
          nombre: tramite.nombre,
          dependencia: tramite.dependencia,
          costo: tramite.costo,
          plazo: plazoLegible(tramite.plazo),
          requisitos: tramite.requisitos.map(nombreRequisito),
        },
        hallazgos,
        fecha: f.fecha,
        hora: f.hora || undefined,
        oficina: f.oficina.trim() || tramite.dependencia,
        quien: f.quien.trim() || undefined,
        extra: f.extra.trim() || undefined,
        testigos: f.testigos.trim() || undefined,
        nombre: f.nombre.trim() || undefined,
        contacto: f.contacto.trim() || undefined,
      });
      const huella = await huellaDe(bytes);
      // Al servidor solo viaja la huella del escrito, nunca su contenido.
      const sello = await fetch("/api/sello", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ huella }) })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const nombre = `denuncia-${tramite.clave}-${f.fecha}.pdf`;
      setListo({
        pdf: urlDe(bytes as BlobPart, "application/pdf"),
        ots: sello?.ots ? urlDe(Uint8Array.from(atob(sello.ots), (c) => c.charCodeAt(0)), "application/octet-stream") : null,
        huella,
        sellado: sello?.sellado ?? null,
        calendario: sello?.calendario ?? null,
        nombre,
      });
    } catch (err) {
      console.error(err);
      setError("No pude armar el escrito. Inténtalo de nuevo.");
    }
    setEstado("libre");
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-tinta px-4 font-bold text-panel transition-transform duration-150 active:scale-[0.98]"
      >
        <FileSignature className="size-5" aria-hidden />
        Preparar mi denuncia formal
      </button>
    );
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {listo ? (
        <motion.div key="listo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: salida }} className="mt-3 rounded-[12px] bg-piso p-4" role="status">
          <p className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-5 text-bien" aria-hidden />
            Tu escrito está listo{listo.sellado ? " y sellado en el tiempo" : ""}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a href={listo.pdf} download={listo.nombre} className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.98]">
              <Download className="size-5" aria-hidden />
              Descargar el escrito (PDF)
            </a>
            {listo.ots ? (
              <a href={listo.ots} download={`${listo.nombre}.ots`} className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold">
                <Fingerprint className="size-5" aria-hidden />
                Descargar el sello de tiempo (.ots)
              </a>
            ) : null}
          </div>
          <p className="mt-3 text-[0.9375rem] leading-snug text-tinta-suave">
            {listo.sellado ? (
              <>
                Huella del documento: <span className="font-mono text-[0.8125rem] break-all text-tinta">{listo.huella.slice(0, 32)}…</span>. Quedó registrada el{" "}
                {new Date(listo.sellado).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Hermosillo" })} en el calendario público {listo.calendario}, y en unas horas se ancla en la
                cadena de Bitcoin. Con los dos archivos, cualquiera puede comprobar en opentimestamps.org que el escrito no se modificó después.
              </>
            ) : (
              "No pude sellarlo en el tiempo ahora, pero el escrito sirve igual."
            )}
          </p>
          <p className="mt-3 font-bold">Revísalo, fírmalo y preséntalo:</p>
          <ul className="mt-1 space-y-1 text-[0.9375rem] leading-snug">
            <li>
              <a href={DENUNCIA.enLinea} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-1.5 font-bold underline">
                En línea, en el portal de denuncias de la Contraloría
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </a>
            </li>
            <li>
              En persona: {DENUNCIA.domicilio}. {DENUNCIA.horario}. Teléfono {DENUNCIA.telefono}.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-snug text-tinta-suave">Tu escrito y tus datos no salieron de tu teléfono. Solo se envió su huella para sellarlo.</p>
        </motion.div>
      ) : (
        <motion.form key="formulario" onSubmit={generar} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: salida }} className="mt-3 rounded-[12px] bg-piso p-4">
          <p className="leading-snug">
            La Contraloría pide un escrito que relate los hechos con pruebas. Lo armo con tu revisión y la ficha oficial; tú lo revisas y lo presentas.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block font-bold">
              Fecha
              <input type="date" required max={hoy()} value={f.fecha} onChange={cambiar("fecha")} className={campo} />
            </label>
            <label className="block font-bold">
              Hora <span className="font-normal text-tinta-suave">(aprox.)</span>
              <input type="time" value={f.hora} onChange={cambiar("hora")} className={campo} />
            </label>
          </div>
          <label className="mt-3 block font-bold">
            Oficina o ventanilla
            <input value={f.oficina} onChange={cambiar("oficina")} required maxLength={160} className={campo} />
          </label>
          <label className="mt-3 block font-bold">
            ¿Quién te atendió? <span className="font-normal text-tinta-suave">(opcional)</span>
            <input value={f.quien} onChange={cambiar("quien")} maxLength={160} placeholder="Nombre, número de gafete o cómo lo describirías" className={campo} />
          </label>
          <label className="mt-3 block font-bold">
            ¿Algo más que contar? <span className="font-normal text-tinta-suave">(opcional)</span>
            <textarea value={f.extra} onChange={cambiar("extra")} rows={3} maxLength={800} placeholder="Lo que pasó con tus palabras" className={`${campo} resize-none`} />
          </label>
          <label className="mt-3 block font-bold">
            ¿Alguien lo vio? <span className="font-normal text-tinta-suave">(opcional)</span>
            <input value={f.testigos} onChange={cambiar("testigos")} maxLength={160} placeholder="Nombre de quien te acompañaba" className={campo} />
          </label>

          <fieldset className="mt-5 border-t border-linea pt-4">
            <legend className="sr-only">Tus datos</legend>
            <p className="font-bold">Tus datos son opcionales</p>
            <p className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave">
              La ley permite denunciar sin nombre (artículo 91 de la Ley General de Responsabilidades Administrativas). Si dejas un contacto, te pueden avisar del resultado.
            </p>
            <label className="mt-3 block font-bold">
              Tu nombre
              <input value={f.nombre} onChange={cambiar("nombre")} maxLength={120} autoComplete="name" className={campo} />
            </label>
            <label className="mt-3 block font-bold">
              Correo o teléfono para avisarte
              <input value={f.contacto} onChange={cambiar("contacto")} maxLength={120} className={campo} />
            </label>
          </fieldset>

          <label className="mt-5 flex items-start gap-3 leading-snug">
            <input type="checkbox" checked={f.protesta} onChange={cambiar("protesta")} className="mt-1 size-5 shrink-0 accent-[var(--tinta)]" />
            <span>Declaro bajo protesta de decir verdad que los hechos que voy a denunciar son ciertos.</span>
          </label>

          {error ? (
            <p role="alert" className="mt-3 font-bold text-error">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={estado === "armando"}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-tinta px-4 font-bold text-panel transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-60"
          >
            <FileSignature className="size-5" aria-hidden />
            {estado === "armando" ? "Armando y sellando tu escrito…" : "Armar mi escrito"}
          </button>
          <p className="mt-2 text-sm leading-snug text-tinta-suave">Todo se arma en tu teléfono. Tramita no guarda ni envía tu denuncia.</p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
