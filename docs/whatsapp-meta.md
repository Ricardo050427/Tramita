# Sagui en WhatsApp: cuenta de desarrollador de Meta

Guía para preparar lo que necesita Tramita para responder por WhatsApp con la API de WhatsApp Cloud. Se basa en la documentación oficial de Meta, consultada el 11 de noviembre de 2026. Los nombres de botones están en inglés porque así aparecen en el panel de Meta.

## Lo que necesitas antes

- Una cuenta de Facebook (o una cuenta de Meta administrada).
- Un teléfono con WhatsApp para recibir y contestar los mensajes de prueba.
- Acceso a tu correo y a tu teléfono para los códigos de verificación.

La guía oficial de registro no pide tarjeta de crédito.

## 1. Registrarte como desarrollador

1. Con tu sesión de Facebook abierta, entra a [developers.facebook.com](https://developers.facebook.com) y pulsa **Get Started**.
2. Pulsa **Next** para aceptar los términos de la plataforma y las políticas para desarrolladores.
3. Verifica tu cuenta con los códigos que Meta envía a tu teléfono y a tu correo.
4. Elige tu ocupación.

## 2. Crear la app

1. Entra a [developers.facebook.com/apps](https://developers.facebook.com/apps) y pulsa **Create App**.
2. Escribe un nombre (por ejemplo, "Tramita") y tu correo.
3. Elige el caso de uso **Connect with customers through WhatsApp** y pulsa **Next**.
4. Elige un portafolio comercial (business portfolio) o crea uno nuevo.
5. Pulsa **Next** en la lista de requisitos de publicación y luego **Create app**.

El caso de uso no se puede quitar después. Puedes administrar hasta 15 apps que no estén conectadas a un negocio verificado.

## 3. Activar la API y obtener el número de prueba

1. Pulsa **Start using the API**. Se abre **API Setup**.
2. Conecta la app a una cuenta de WhatsApp Business. Si no tienes una, pulsa **Create a WhatsApp Business account** y sigue los pasos.
3. Guarda el **Messaging account ID** que aparece al conectarla (es el identificador de la cuenta de WhatsApp Business).
4. Meta crea y registra un **número de prueba gratuito**. Guarda su **Phone number ID**.
5. Pulsa **Generate access token**. Este token es temporal y caduca pronto: sirve solo para la primera prueba.

## 4. Mandar el primer mensaje de prueba

1. En **To**, agrega tu número de WhatsApp con `+52` y el número completo.
2. Pulsa **Send message**. Te llega la plantilla "hello world".
3. Contesta ese mensaje desde tu WhatsApp. Eso abre la ventana de atención de 24 horas.

La guía de Meta no indica cuántos números de prueba se pueden agregar.

## 5. Crear el token permanente

El token del paso 3 caduca. Para que Sagui funcione sin interrupciones se usa un usuario del sistema:

1. Entra a [business.facebook.com/latest/settings](https://business.facebook.com/latest/settings) y abre **System users**.
2. Pulsa **Add+** y crea el usuario del sistema.
3. Selecciónalo y pulsa **Assign Assets**:
   - Elige la app y activa **Manage app** con **Full control**.
   - Elige la cuenta de WhatsApp y activa **Manage WhatsApp Business accounts** con **Full control**.
   - Pulsa **Assign assets**.
4. Pulsa **Generate token** con los permisos `business_management`, `whatsapp_business_messaging` y `whatsapp_business_management`.
5. Copia el token y guárdalo en un lugar seguro.

## 6. Qué pasarle al programador

| Dato | Cómo se entrega |
| --- | --- |
| Phone number ID del número de prueba | Por chat, no es secreto |
| Messaging account ID | Por chat, no es secreto |
| Tu número de prueba con `+52` | Por chat |
| Token permanente del usuario del sistema | **Nunca por chat.** Guárdalo tú en Vercel como variable sensible `WHATSAPP_TOKEN` |

La dirección del webhook y su token de verificación los define quien programa la integración.

### Cómo guardar el token en Vercel

1. Entra al proyecto `tramita` en [vercel.com](https://vercel.com) y abre **Settings → Environment Variables**.
2. Agrega `WHATSAPP_TOKEN` con el token, marca **Sensitive** y elige **Production**.
3. Guarda. El siguiente despliegue ya lo usará.

## 7. Webhook (lo hace el programador)

1. Tramita publica una dirección HTTPS que:
   - responde la verificación de Meta (si el token coincide, devuelve el `hub.challenge`);
   - recibe los mensajes y responde con código 200.
2. En el panel de la app: **WhatsApp → Webhooks → Configuration**.
3. Se pegan la **Callback URL** y el **Verify token**, y se pulsa **Verify and save**.
4. Se suscribe al campo **messages**. El botón **Test** manda un evento de prueba.

## Límites a tener en cuenta

- Los mensajes libres solo se pueden enviar dentro de las 24 horas posteriores a que la persona escribe. Para Sagui no es problema: el ciudadano siempre escribe primero.
- El primer mensaje de prueba con el token temporal es la plantilla `hello_world`.
- Un portafolio nuevo puede registrar dos números de negocio; el límite sube al verificar el negocio.
- Enviar mensajes que inicia el negocio requiere agregar un método de pago en el administrador comercial.
- Los ejemplos oficiales usan la versión `v23.0` de la API, aunque otras páginas de Meta muestran versiones más nuevas. Revisa la que indique el panel.

## Fuentes

- [WhatsApp Cloud API: primeros pasos](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)
- [Registro de desarrollador](https://developers.facebook.com/documentation/development/register)
- [Crear una app](https://developers.facebook.com/documentation/development/create-an-app)
- [Caso de uso de WhatsApp](https://developers.facebook.com/documentation/development/create-an-app/whatsapp-use-case)
- [Webhook de prueba](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/set-up-whatsapp-echo-bot)
- [Números de teléfono de negocio](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers)
