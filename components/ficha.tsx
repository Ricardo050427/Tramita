"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bookmark, ChevronDown, Download, Clock, ExternalLink, LocateFixed, MapPin, Phone, QrCode, ShieldCheck } from "lucide-react";
import { ListaDocumentos, rutaDocumento } from "./documentos";
import { Encabezado } from "./senal";
import { estadoHorario } from "@/lib/horario";
import { datosDe, dejarDeSeguir, seguir, useMisTramites } from "@/lib/mis-tramites";
import { faltantesArt54 } from "@/lib/observatorio";
import type { ResumenReportes } from "@/lib/tipos-reporte";
import type { Documento, Oficina, Requisito, Tramite } from "@/lib/tipos";

const ALMACEN = "tramita:lista:";

export function leerMarcados(clave: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(ALMACEN + clave) ?? "[]");
  } catch {
    return [];
  }
}

function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <span
      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-[6px] border-2 border-tinta transition-colors duration-150 ${
        marcada ? "bg-tinta" : "bg-panel"
      }`}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <motion.path
          d="M4 10.5 8.2 14.5 16 6"
          fill="none"
          stroke="var(--senal)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: marcada ? 1 : 0, opacity: marcada ? 1 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </span>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!valor) return null;
  const corte = valor.search(/[.,]\s/);
  const largo = valor.length > 48 && corte > 0;
  return (
    <div className="flex gap-4 border-t border-linea py-3">
      <dt className="w-20 shrink-0 text-tinta-suave">{etiqueta}</dt>
      <dd className="min-w-0 flex-1 font-medium">
        {largo && !abierto ? valor.slice(0, corte) : valor}
        {largo && !abierto ? (
          <button type="button" onClick={() => setAbierto(true)} className="ml-1.5 font-normal underline">
            Ver más
          </button>
        ) : null}
      </dd>
    </div>
  );
}

function usarAhora() {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => setAhora(new Date()), []);
  return ahora;
}

function EstadoHoy({ horario, ahora }: { horario: string; ahora: Date | null }) {
  const estado = ahora ? estadoHorario(horario, ahora) : null;
  if (!estado) return null;
  return <span className={`block font-medium ${estado.abierto ? "text-bien" : "text-tinta-suave"}`}>{estado.texto}</span>;
}

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const ligaMapa = (consulta: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
const ligaTelefono = (t: string) => `tel:${t.replace(/\D/g, "").slice(0, 10)}`;

function ListaOficinas({ oficinas }: { oficinas: Oficina[] }) {
  const ahora = usarAhora();
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null);
  const [estado, setEstado] = useState<"libre" | "buscando" | "error">("libre");
  const [todas, setTodas] = useState(false);

  function ubicar() {
    setEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosicion({ lat: p.coords.latitude, lng: p.coords.longitude });
        setEstado("libre");
      },
      () => setEstado("error"),
      { timeout: 8000, maximumAge: 60000 },
    );
  }

  const ordenadas = posicion
    ? [...oficinas].map((o) => ({ o, km: distanciaKm(posicion, o) })).sort((a, b) => a.km - b.km)
    : oficinas.map((o) => ({ o, km: null }));
  const visibles = todas ? ordenadas : ordenadas.slice(0, 3);

  return (
    <>
      <p className="mt-1 text-[0.9375rem] leading-snug text-tinta-suave">Centros de atención de Tesorería publicados por el Ayuntamiento.</p>
      {!posicion ? (
        <button type="button" onClick={ubicar} disabled={estado === "buscando"} className="mt-2 flex min-h-11 items-center gap-2 font-bold underline disabled:opacity-60">
          <LocateFixed className="size-5" aria-hidden />
          {estado === "buscando" ? "Buscando tu ubicación…" : "Ver el más cercano a mí"}
        </button>
      ) : null}
      {estado === "error" ? <p className="text-[0.9375rem] text-error">No pude obtener tu ubicación. Revisa el permiso de tu navegador.</p> : null}
      <ul className="mt-1">
        {visibles.map(({ o, km }) => (
          <li key={o.nombre} className="border-t border-linea py-3 first:border-t-0">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-bold">{o.nombre}</span>
              {km !== null ? <span className="shrink-0 text-tinta-suave">{km < 10 ? km.toFixed(1) : Math.round(km)} km</span> : null}
            </p>
            <a href={ligaMapa(`${o.lat},${o.lng}`)} target="_blank" rel="noreferrer" className="mt-0.5 block leading-snug underline">
              {o.direccion}, {o.colonia}
            </a>
            <p className="mt-1 text-[0.9375rem] leading-snug">
              <EstadoHoy horario={o.horario} ahora={ahora} />
              {o.horario}
            </p>
            {o.telefono ? (
              <a href={ligaTelefono(o.telefono)} className="mt-0.5 flex min-h-9 items-center gap-2 underline">
                <Phone className="size-4 shrink-0" aria-hidden />
                {o.telefono}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      {!todas && ordenadas.length > 3 ? (
        <button type="button" onClick={() => setTodas(true)} className="min-h-11 font-bold underline">
          Ver los {ordenadas.length} centros
        </button>
      ) : null}
    </>
  );
}

function DondeIr({ tramite }: { tramite: Tramite }) {
  const ahora = usarAhora();
  return (
    <section className="border-t border-linea px-4 py-3">
      <h3 className="text-lg font-bold">Dónde ir</h3>
      {tramite.oficinas ? (
        <ListaOficinas oficinas={tramite.oficinas} />
      ) : (
        <>
          {tramite.domicilio ? (
            <a href={ligaMapa(`${tramite.domicilio}, Sonora`)} target="_blank" rel="noreferrer" className="flex min-h-11 items-start gap-3 py-2">
              <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span className="underline">{tramite.domicilio}</span>
            </a>
          ) : null}
          {tramite.horario ? (
            <p className="flex min-h-11 items-start gap-3 py-2">
              <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                <EstadoHoy horario={tramite.horario} ahora={ahora} />
                {tramite.horario}
              </span>
            </p>
          ) : null}
          {tramite.telefono ? (
            <a href={ligaTelefono(tramite.telefono)} className="flex min-h-11 items-start gap-3 py-2">
              <Phone className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span className="underline">{tramite.telefono}</span>
            </a>
          ) : null}
        </>
      )}
    </section>
  );
}

export function FichaPlegada({ tramite }: { tramite: Tramite }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
        className="flex min-h-14 w-full items-center gap-3 rounded-[14px] border border-linea bg-panel px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-tinta-suave">Otra opción</span>
          <span className="block leading-snug font-bold">{tramite.nombre}</span>
        </span>
        <ChevronDown className={`size-6 shrink-0 transition-transform duration-200 ${abierta ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {abierta ? (
          <motion.div
            key="ficha"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <Ficha tramite={tramite} compacta />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Transparencia({ tramite }: { tramite: Tramite }) {
  const faltan = faltantesArt54(tramite);
  return (
    <p>
      {faltan.length
        ? `Esta ficha no publica ${faltan.map((f) => f.corto.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " ni $1")}, aunque la ley pide registrarlo. `
        : "Esta ficha publica los 8 datos que pide la ley y se pueden comprobar. "}
      <Link href="/vigila" className="font-bold text-tinta underline">
        Ver el observatorio
      </Link>
    </p>
  );
}

// Una sola consulta por visita: todas las fichas abiertas comparten el mismo resumen.
let resumenReportes: Promise<ResumenReportes | null> | null = null;
const pedirResumen = () =>
  (resumenReportes ??= fetch("/api/reportes")
    .then((r) => (r.ok ? (r.json() as Promise<ResumenReportes>) : null))
    .catch(() => null));

function ReportesDelTramite({ clave }: { clave: string }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let vigente = true;
    void pedirResumen().then((r) => {
      if (vigente) setTotal(r?.porTramite.find((t) => t.clave === clave)?.total ?? 0);
    });
    return () => {
      vigente = false;
    };
  }, [clave]);
  if (!total) return null;
  return (
    <p className="font-medium text-error">
      {total === 1 ? "1 persona reportó" : `${total} personas reportaron`} algo que no cuadra en este trámite.{" "}
      <Link href="/vigila#reportes" className="underline">
        Ver reportes
      </Link>
    </p>
  );
}

export function mensajeProgreso(tramite: Tramite, faltan: number) {
  const total = tramite.requisitos.length;
  if (!total) return "Confirma los requisitos por teléfono";
  if (faltan === 0) return tramite.enLinea ? "Todo listo. Hazlo en línea" : "Todo listo. Ya puedes ir";
  if (faltan === total) return `Junta ${total} ${total === 1 ? "requisito" : "requisitos"}`;
  return `Te ${faltan === 1 ? "falta 1 requisito" : `faltan ${faltan} requisitos`}`;
}

function AyudaRequisito({ requisito, documentos }: { requisito: Requisito; documentos?: Documento[] }) {
  const documento = documentos?.find((d) => d.id === requisito.documento);
  if (!documento && !requisito.obtener) return null;
  return (
    <div className="mb-1 ml-10 flex flex-wrap gap-x-4">
      {documento ? (
        <a href={rutaDocumento(documento)} download className="flex min-h-11 items-center gap-1.5 font-bold underline">
          <Download className="size-4 shrink-0" aria-hidden />
          Descargar formato
        </a>
      ) : null}
      {requisito.obtener ? (
        <Link href={`/tramite/${requisito.obtener.clave}`} className="flex min-h-11 items-center gap-1.5 underline">
          ¿No lo tienes? Cómo conseguirlo
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function Ficha({
  tramite,
  compacta,
  alProgreso,
}: {
  tramite: Tramite;
  compacta?: boolean;
  alProgreso?: (faltan: number) => void;
}) {
  const [marcados, setMarcados] = useState<number[]>([]);
  const [verTodos, setVerTodos] = useState(!compacta);
  const total = tramite.requisitos.length;
  const guardado = Boolean(useMisTramites()[tramite.clave]);

  useEffect(() => {
    const guardados = leerMarcados(tramite.clave);
    setMarcados(guardados);
    alProgreso?.(total - guardados.length);
  }, [tramite.clave, total, alProgreso]);

  function alternar(i: number) {
    navigator.vibrate?.(8);
    const siguiente = marcados.includes(i) ? marcados.filter((m) => m !== i) : [...marcados, i];
    setMarcados(siguiente);
    alProgreso?.(total - siguiente.length);
    try {
      localStorage.setItem(ALMACEN + tramite.clave, JSON.stringify(siguiente));
    } catch {}
    if (siguiente.length) seguir(datosDe(tramite));
  }

  const visibles = verTodos ? tramite.requisitos : tramite.requisitos.slice(0, 5);

  return (
    <article className="overflow-hidden rounded-[14px] border border-linea bg-panel">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em] text-balance">{tramite.nombre}</h2>
        <p className="mt-1 text-tinta-suave">{tramite.dependencia}</p>
        <button
          type="button"
          aria-pressed={guardado}
          onClick={() => (guardado ? dejarDeSeguir(tramite.clave) : seguir(datosDe(tramite)))}
          className={`mt-3 flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${guardado ? "bg-tinta text-panel" : "bg-piso text-tinta"}`}
        >
          <motion.span key={String(guardado)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}>
            <Bookmark className={`size-[1.125rem] ${guardado ? "fill-senal text-senal" : ""}`} aria-hidden />
          </motion.span>
          {guardado ? "En Mis trámites" : "Guardar en Mis trámites"}
        </button>
        {guardado && compacta ? <p className="mt-1.5 text-sm leading-snug text-tinta-suave">Esta conversación también queda ahí para seguirla otro día.</p> : null}
      </div>

      <dl className="px-4">
        <Dato etiqueta="Costo" valor={tramite.costo} />
        <Dato etiqueta="Respuesta" valor={/^indefinido/i.test(tramite.plazo.trim()) ? "Sin plazo publicado" : tramite.plazo} />
        <Dato etiqueta="Obtienes" valor={tramite.obtienes === "Ninguno" ? "" : tramite.obtienes} />
      </dl>

      <div className="grid grid-cols-2 gap-2 border-t border-linea px-4 py-3">
        <Link
          href={`/pase/${tramite.clave}`}
          className="flex min-h-16 flex-col justify-center rounded-[10px] bg-piso px-3 py-2.5 transition-transform duration-150 active:scale-[0.97]"
        >
          <span className="flex items-center gap-1.5 leading-tight font-bold">
            <QrCode className="size-[1.125rem] shrink-0" aria-hidden />
            Pase para ventanilla
          </span>
          <span className="mt-0.5 text-sm leading-snug text-tinta-suave">Muéstralo al llegar</span>
        </Link>
        <Link
          href={`/tramite/${tramite.clave}/verificar`}
          className="flex min-h-16 flex-col justify-center rounded-[10px] bg-piso px-3 py-2.5 transition-transform duration-150 active:scale-[0.97]"
        >
          <span className="flex items-center gap-1.5 leading-tight font-bold">
            <ShieldCheck className="size-[1.125rem] shrink-0" aria-hidden />
            ¿Te pidieron algo más?
          </span>
          <span className="mt-0.5 text-sm leading-snug text-tinta-suave">Compáralo con esta ficha</span>
        </Link>
      </div>

      {tramite.documentos?.length ? (
        <section className="border-t border-tinta px-4 py-4">
          <h3 className="text-lg font-bold">Documentos para descargar</h3>
          <ListaDocumentos documentos={tramite.documentos} clave={tramite.clave} />
        </section>
      ) : null}

      <section className="border-t border-tinta px-4 pt-4 pb-2">
        <h3 className="text-lg font-bold">Qué necesitas</h3>
        {total ? (
          <ul className="mt-2">
            {visibles.map((r, i) => {
              const marcada = marcados.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={marcada}
                    onClick={() => alternar(i)}
                    className="flex min-h-11 w-full items-start gap-3 py-2 text-left"
                  >
                    <Casilla marcada={marcada} />
                    <span className={`min-w-0 flex-1 transition-opacity duration-200 ${marcada ? "opacity-55" : ""}`}>
                      <span className="block leading-snug font-medium">{r.titulo}</span>
                      {r.detalle ? <span className="mt-0.5 block text-[0.9375rem] leading-snug text-tinta-suave">{r.detalle}</span> : null}
                    </span>
                  </button>
                  <AyudaRequisito requisito={r} documentos={tramite.documentos} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 pb-2 text-tinta-suave">
            El catálogo no publica requisitos para este trámite. Confírmalos por teléfono antes de ir.
          </p>
        )}
        {!verTodos && total > 5 ? (
          <button type="button" onClick={() => setVerTodos(true)} className="min-h-11 font-bold underline">
            Ver los {total} requisitos
          </button>
        ) : null}
      </section>

      <DondeIr tramite={tramite} />

      {tramite.enLinea ? (
        <div className="px-4 pb-4">
          <a
            href={tramite.enLinea}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-13 items-center justify-between rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.98]"
          >
            {tramite.enLineaGeneral ? "Ir al portal de este servicio" : "Hacer este trámite en línea"}
            <ExternalLink className="size-5" aria-hidden />
          </a>
          {tramite.enLineaGeneral ? (
            <p className="mt-2 text-[0.9375rem] leading-snug text-tinta-suave">
              Esta página oficial reúne varios servicios. Busca ahí «{tramite.nombre}».
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-linea bg-piso/60 px-4 py-3 text-sm leading-snug text-tinta-suave">
        <Transparencia tramite={tramite} />
        <Link href={`/tramite/${tramite.clave}/reportar`} className="mt-2 flex min-h-11 items-center gap-1.5 font-bold text-tinta underline">
          ¿Algo no cuadra en este trámite? Repórtalo
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
        <ReportesDelTramite clave={tramite.clave} />
        <a href={`/fuente/${tramite.clave}`} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center justify-between gap-3">
          <span>Fuente oficial: ver esta ficha en el catálogo municipal (clave {tramite.clave})</span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </a>
      </div>
    </article>
  );
}

export function VistaTramite({ tramite, children }: { tramite: Tramite; children?: React.ReactNode }) {
  const [mensaje, setMensaje] = useState(() => mensajeProgreso(tramite, tramite.requisitos.length));
  const alProgreso = useCallback((faltan: number) => setMensaje(mensajeProgreso(tramite, faltan)), [tramite]);

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={mensaje} volver={`/categoria/${tramite.categoria}`} />
      <main className="mx-auto max-w-2xl px-3 py-4 pb-16">
        <Ficha tramite={tramite} alProgreso={alProgreso} />
        {tramite.descripcion ? (
          <section className="mt-6 px-1">
            <h3 className="text-lg font-bold">De qué se trata</h3>
            <p className="mt-1 leading-relaxed">{tramite.descripcion}</p>
          </section>
        ) : null}
      </main>
      {children}
    </div>
  );
}
