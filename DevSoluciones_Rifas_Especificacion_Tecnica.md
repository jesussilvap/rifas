# DevSoluciones Rifas

## Especificación funcional y técnica del aplicativo

**Versión:** 1.2\
**Fecha:** 24 de noviembre de 2026\
**Estado:** Documento de diseño y planificación\
**Propietario del proyecto:** DevSoluciones

------------------------------------------------------------------------

## 1. Resumen del proyecto

DevSoluciones Rifas será una aplicación web administrable, diseñada bajo
un enfoque **responsivo y *mobile-first*** para adaptarse correctamente a
cualquier dispositivo móvil (smartphones de pantalla pequeña, media o
grande, plegables, tablets) y escritorio, permitiendo gestionar múltiples
rifas de manera centralizada. Los participantes podrán consultar rifas
publicadas, seleccionar uno o varios números, registrar sus datos,
realizar una transferencia manual mediante Nequi o Bre-B, cargar el
comprobante desde su celular o computador y reportar el pago por
WhatsApp.

La confirmación del pago será exclusivamente manual desde el panel
administrativo. Un número solo se considerará **vendido** cuando un
administrador autorizado haya verificado el ingreso del dinero y
aprobado la solicitud.

La plataforma se desarrollará con:

-   **Frontend:** React 19 + Vite.
-   **Estilos:** Tailwind CSS 4.
-   **Backend:** Node.js + Express.
-   **Base de datos:** MySQL (InnoDB).
-   **Conexión a MySQL:** `mysql2/promise`, con consultas
    parametrizadas.
-   **Alojamiento:** Hostinger, sujeto a las capacidades del plan
    contratado.
-   **Control de versiones:** Git y GitHub.

Firebase, Firestore y las pasarelas de pago no forman parte de la
arquitectura inicial.

> **Condición legal:** el software no autoriza por sí mismo la
> comercialización de rifas. Antes de publicar o vender participaciones
> reales en Colombia se debe validar el régimen aplicable, la
> autorización, el operador habilitado y el reglamento correspondiente.
> La aplicación debe impedir la publicación comercial hasta que se
> registren y validen los soportes requeridos.

------------------------------------------------------------------------

## 2. Objetivos

1.  Administrar varias rifas desde un solo panel.
2.  Configurar premios, precios, numeración, fechas y reglamentos.
3.  Mostrar una cuadrícula de números con disponibilidad actualizada.
4.  Evitar que dos participantes reserven el mismo número.
5.  Reservar números durante 15 minutos.
6.  Registrar participantes sin exigirles crear una cuenta.
7.  Permitir pagos manuales por transferencia.
8.  Recibir comprobantes dentro de la plataforma.
9.  Indicar al participante que también debe enviar el comprobante al
    WhatsApp configurado.
10. Permitir la aprobación o rechazo manual de los pagos.
11. Mantener trazabilidad de las acciones administrativas.
12. Generar reportes de ventas, recaudo, pagos y participantes.
13. Garantizar una experiencia totalmente responsiva (*mobile-first*)
    tanto en el portal público como en el panel administrativo, adaptable
    a cualquier teléfono móvil, tablet o pantalla de escritorio.

------------------------------------------------------------------------

## 3. Roles de usuario

### 3.1 Participante

Puede:

-   Consultar rifas publicadas.
-   Consultar premios, precio, fechas y reglamento.
-   Consultar números disponibles.
-   Seleccionar varios números disponibles.
-   Registrar nombres completos y WhatsApp.
-   Aceptar el reglamento y autorizar el tratamiento de datos.
-   Consultar las instrucciones de transferencia.
-   Cargar el comprobante de pago.
-   Abrir WhatsApp con un mensaje prellenado.
-   Finalizar la solicitud y recibir un código de referencia.

No puede:

-   Marcar números como vendidos.
-   Aprobar su propio pago.
-   Modificar estados de reservas desde el navegador.
-   Consultar comprobantes privados de otros participantes.

### 3.2 Superadministrador (`SUPER_ADMIN`)

Puede:

-   Administrar usuarios y roles.
-   Crear, editar, pausar y cerrar rifas.
-   Configurar medios de pago y WhatsApp.
-   Gestionar premios, números, participantes y pagos.
-   Consultar reportes.
-   Registrar operadores, autorizaciones y reglamentos.
-   Consultar auditoría.
-   Configurar parámetros generales.

### 3.3 Administrador (`ADMIN`)

Puede administrar rifas, participantes y pagos según los permisos
asignados. No debe poder modificar la configuración crítica de seguridad
ni eliminar registros de auditoría.

### 3.4 Operador (`OPERADOR`)

Puede consultar información y ejecutar tareas operativas limitadas, de
acuerdo con los permisos asignados.

Los roles deben validarse en el backend. Ocultar botones en React no
constituye un control de seguridad.

### 3.5 Matriz de permisos por rol

  Acción / Módulo                           `SUPER_ADMIN`   `ADMIN`   `OPERADOR`
  ----------------------------------------- --------------- --------- ------------
  Gestionar usuarios y roles                Sí              No        No
  Configurar medios de pago y WhatsApp      Sí              No        No
  Crear, editar, pausar y cerrar rifas      Sí              Sí        No
  Registrar autorizaciones y reglamentos    Sí              Sí        Solo lectura
  Consultar cuadrícula y participantes      Sí              Sí        Sí
  Ver comprobantes privados                 Sí              Sí        Sí (auditado)
  Aprobar o rechazar pagos                  Sí              Sí        No
  Liberar números manualmente con motivo    Sí              Sí        No
  Registrar resultado y acta de sorteo      Sí              Sí        No
  Consultar reportes y exportar CSV/Excel   Sí              Sí        Solo lectura
  Consultar registros de auditoría          Sí              Lectura   No
  Eliminar registros de auditoría           No              No        No

Ningún rol puede eliminar registros de auditoría desde la aplicación. Si
en el futuro se requieren permisos granulares adicionales, se extenderá
mediante una tabla de permisos por rol sin debilitar las restricciones
base anteriores.

------------------------------------------------------------------------

## 4. Estados y reglas visuales de los números

  -----------------------------------------------------------------------
  Color                   Estado interno          Significado
  ----------------------- ----------------------- -----------------------
  Verde                   `DISPONIBLE`            El número puede
                                                  seleccionarse.

  Rojo                    `VENDIDO`               Pago verificado y
                                                  aprobado.

  Gris                    `PENDIENTE`             Número reservado o con
                                                  pago reportado
                                                  pendiente de revisión.

  Azul                    `SELECCIONADO`          Selección temporal en
                                                  la interfaz del
                                                  participante actual.
  -----------------------------------------------------------------------

`SELECCIONADO` es un estado visual local; no debe ser un estado
persistente de inventario. Cuando el participante solicita reservar, el
backend valida y crea la reserva.

La cuadrícula debe:

-   Mostrar números con ceros a la izquierda cuando aplique (por
    ejemplo, `025`).
-   Permitir selección múltiple.
-   Deshabilitar números vendidos y pendientes.
-   Actualizarse cuando cambie el inventario.
-   Mostrar total de números, disponibles, pendientes y vendidos.
-   Indicar el precio por número y el total seleccionado.
-   Adaptar dinámicamente el número de columnas al ancho del dispositivo
    (por ejemplo, 4 a 5 columnas en móviles pequeños, 6 a 8 en tablets y
    10 o más en escritorio), manteniendo botones táctiles cómodos de al
    menos `44 x 44 px` para evitar pulsaciones accidentales.
-   Incluir búsqueda rápida por número, filtros por estado y paginación
    o agrupación por bloques (centenas/millares) cuando la rifa tenga
    alta cantidad de números, evitando degradación de rendimiento en
    dispositivos móviles.
-   Mostrar una barra inferior fija (*sticky*) en móvil con los números
    seleccionados, el total calculado y el botón de continuar, respetando
    las áreas seguras (*safe areas*) del dispositivo.

------------------------------------------------------------------------

## 5. Flujo funcional del participante

### 5.1 Catálogo de rifas

Cada tarjeta de rifa muestra:

-   Imagen principal.
-   Título.
-   Descripción breve.
-   Categoría.
-   Precio por número.
-   Cantidad de números.
-   Fecha de cierre y fecha del sorteo.
-   Barra de progreso.
-   Estado de publicación.
-   Botón para consultar la rifa.

Solo se muestran públicamente rifas que estén publicadas y que hayan
superado las validaciones administrativas y legales configuradas.

### 5.2 Detalle de la rifa

Muestra:

-   Galería de imágenes.
-   Descripción del premio.
-   Precio por número.
-   Numeración inicial y final.
-   Fecha de sorteo.
-   Lotería o mecanismo de sorteo autorizado y descrito en el
    reglamento.
-   Reglamento y soportes que deban ponerse a disposición del público.
-   Cuadrícula de números.
-   Indicadores por estado.

### 5.3 Selección y registro

El participante selecciona uno o varios números y registra:

  Campo                                  Regla
  -------------------------------------- ---------------------------------------
  Nombres completos                      Obligatorio
  WhatsApp                               Obligatorio, validar formato y país
  Correo                                 Opcional, si la operación no lo exige
  Aceptación del reglamento              Obligatoria
  Autorización de tratamiento de datos   Obligatoria

El backend calcula el valor total. Nunca debe confiar en el precio o
total enviado por React.

### 5.4 Reserva

Al confirmar la selección:

1.  El backend inicia una transacción MySQL.
2.  Bloquea los registros de los números solicitados.
3.  Comprueba que todos pertenezcan a la rifa y estén disponibles.
4.  Crea o identifica al participante.
5.  Crea una reserva con vencimiento a los 15 minutos.
6.  Relaciona los números con la reserva.
7.  Cambia los números a `PENDIENTE`.
8.  Confirma la transacción.

Si un número no está disponible, la operación completa debe fallar y no
debe reservar parcialmente el conjunto solicitado.

El tiempo de vencimiento se calcula usando el reloj del servidor.

### 5.5 Pantalla de pago (flujo en dos pasos)

Para evitar que el participante abra WhatsApp, envíe la captura y cierre
la página sin registrar el comprobante en la plataforma (lo que causaría
que su reserva expire a los 15 minutos), la pantalla de pago debe
estructurarse en **dos pasos secuenciales**:

#### Paso 1: Transferencia, carga del comprobante y finalización

La pantalla debe presentar:

-   Código de reserva.
-   Nombre de la rifa.
-   Participante.
-   Números seleccionados.
-   Precio unitario.
-   Cantidad.
-   Total a transferir.
-   Temporizador o fecha/hora de vencimiento.
-   Datos e imagen de Nequi.
-   Datos e imagen de Bre-B.
-   Botón para copiar número o llave (con respaldo para navegadores
    móviles sin `navigator.clipboard`).
-   Selección de medio de pago utilizado (`NEQUI` o `BREB`) y campo
    opcional de referencia de transferencia.
-   Campo para cargar comprobante (con vista previa inmediata).
-   Botón principal **"Finalizar solicitud"**.

Los datos de pago y el número de WhatsApp se administran desde el panel.

En dispositivos móviles, la pantalla de pago debe optimizarse para uso
con una sola mano: botones de ancho completo para copiar número/llave,
previsualización clara de QR/imágenes de pago sin recortes, temporizador
de reserva visible de forma persistente y selector de comprobante
compatible con la galería y la cámara del teléfono (`accept="image/*"`).

#### Paso 2: Confirmación y envío por WhatsApp

Una vez cargado el comprobante y confirmada la solicitud en el servidor
(reserva en estado `PENDIENTE_VERIFICACION` y código de solicitud
generado), se muestra la pantalla de confirmación con:

-   Código de solicitud de pago y código de reserva.
-   Resumen de números y estado *"Pendiente de verificación"*.
-   Instrucciones claras para enviar el comprobante por WhatsApp.
-   Botón destacado para abrir WhatsApp con el mensaje prellenado ya
    incluyendo el código real de solicitud.

#### Texto requerido para WhatsApp

> **Importante: envío de comprobante de pago**\
> Tu solicitud fue registrada y quedó pendiente de verificación. Para
> agilizar la validación, envía también la imagen del comprobante al
> número de WhatsApp **\[NÚMERO CONFIGURADO\]** usando el botón
> inferior. Tu participación solo quedará confirmada cuando el
> administrador verifique el ingreso del dinero.

El número mostrado debe venir de la configuración de la aplicación; no
debe quedar escrito directamente en el código fuente.

#### Mensaje prellenado de WhatsApp

``` text
Hola, he realizado el pago de mi participación.

Rifa: [NOMBRE DE LA RIFA]
Nombre: [NOMBRE DEL PARTICIPANTE]
Números: [NÚMEROS]
Valor: [TOTAL]
Código de solicitud: [CÓDIGO]
```

El enlace se genera con `https://wa.me/[NUMERO_INTERNACIONAL]` (formato
E.164 sin `+`, espacios ni guiones, por ejemplo `573001234567`) y texto
codificado mediante `encodeURIComponent`.

**Limitación:** el enlace puede abrir WhatsApp con el mensaje preparado,
pero no adjunta automáticamente el archivo que el participante cargó en
el sitio. El usuario debe adjuntar la imagen manualmente en la
conversación.

### 5.6 Carga del comprobante y finalización

-   Validar que la solicitud incluya el `token_acceso` válido de la
    reserva y que la reserva continúe en estado `ACTIVA` y sin vencer
    (bloqueando la fila con `SELECT ... FOR UPDATE`).
-   Aceptar formatos permitidos: JPG, JPEG, PNG y WEBP.
-   Definir un límite de tamaño configurable; recomendación inicial: 5
    MB.
-   Validar extensión, MIME y contenido real (*magic bytes*) del archivo
    en el servidor; re-codificar o limpiar metadatos EXIF antes de
    persistirlo.
-   Generar un nombre aleatorio no predecible.
-   Guardar el archivo en una ubicación privada.
-   Guardar en MySQL la ruta interna y metadatos (MIME, tamaño, nombre
    original saneado), no el contenido binario.
-   Registrar medio de pago y valor reportado.
-   Cambiar la reserva a `PENDIENTE_VERIFICACION`.
-   Mantener los números en gris mientras el pago esté pendiente.
-   Mostrar el código de solicitud, el botón de WhatsApp y las
    instrucciones para seguimiento.

La aplicación debe evitar solicitudes duplicadas mediante una clave de
idempotencia (`Idempotency-Key` persistida como `UNIQUE` en `pagos`) y
validación transaccional del estado de la reserva.

------------------------------------------------------------------------

## 6. Flujo administrativo de pagos

El panel debe tener una bandeja de solicitudes con:

-   Código de pago.
-   Código de reserva.
-   Rifa.
-   Nombre y WhatsApp del participante.
-   Números.
-   Medio de pago.
-   Valor esperado.
-   Valor reportado.
-   Fecha de solicitud.
-   Enlace privado al comprobante.
-   Estado.
-   Acciones de aprobar o rechazar.

### 6.1 Aprobación

Antes de aprobar, el administrador verifica el movimiento en la cuenta
receptora. La imagen del comprobante por sí sola no demuestra que el
dinero haya ingresado.

Al aprobar, una transacción MySQL debe:

1.  Bloquear la solicitud de pago.
2.  Comprobar que esté pendiente.
3.  Comprobar que los números sigan vinculados a esa reserva.
4.  Registrar el administrador y fecha de revisión.
5.  Cambiar el pago a `APROBADO`.
6.  Cambiar la reserva a `COMPLETADA`.
7.  Cambiar los números a `VENDIDO`.
8.  Guardar el evento en auditoría.
9.  Confirmar todo en una sola transacción.

### 6.2 Rechazo y solicitud de corrección

Al rechazar, una transacción MySQL debe:

1.  Bloquear el registro de pago y la reserva asociada con
    `SELECT ... FOR UPDATE`.
2.  Comprobar que el pago esté en estado `PENDIENTE` o
    `REQUIERE_REVISION`.
3.  Exigir motivo obligatorio en `observaciones` y registrar
    administrador y fecha de revisión.
4.  Aplicar una de las dos resoluciones explícitas:
    -   **Rechazo definitivo (`RECHAZADO`):** cambia el pago a
        `RECHAZADO`, cambia la reserva a `CANCELADA` y libera los
        números a `DISPONIBLE` (`id_reserva = NULL`) solo si siguen
        vinculados a esa reserva.
    -   **Solicitud de corrección (`REQUIERE_REVISION`):** mantiene el
        intento rechazado en el historial de `pagos`, devuelve la
        reserva a `ACTIVA` extendiendo `fecha_vencimiento` por un plazo
        configurable (por ejemplo, 15 minutos adicionales) y conserva
        los números en `PENDIENTE` para permitir un nuevo intento de
        carga de comprobante.
5.  Registrar la decisión y el motivo en `auditoria`.

No se deben liberar números automáticamente cuando exista un pago
reportado que todavía esté pendiente de revisión.

------------------------------------------------------------------------

## 7. Reglas de reservas y vencimientos

Tiempo inicial configurable: **15 minutos**.

Estados de reserva:

-   `ACTIVA`
-   `PENDIENTE_VERIFICACION`
-   `COMPLETADA`
-   `EXPIRADA`
-   `CANCELADA`

Reglas:

1.  Una reserva `ACTIVA` sin pago reportado puede expirar.
2.  Una reserva con pago reportado pendiente de verificación no se
    libera automáticamente.
3.  La expiración debe ejecutarse con un proceso programado del backend.
4.  La liberación debe ser transaccional y usar bloqueo de filas
    (`SELECT ... FOR UPDATE SKIP LOCKED` en MySQL 8+) en la reserva y en
    los números ordenados ascendentemente para evitar condiciones de
    carrera con la carga simultánea de un comprobante.
5.  Solo se liberan números que continúen asociados a esa reserva y en
    estado `PENDIENTE`.
6.  Un administrador puede resolver casos excepcionales con motivo y
    auditoría.
7.  La expiración debe usar hora del servidor en UTC y presentar las
    fechas en zona horaria `America/Bogota`.

No depender de tareas del navegador: el participante puede cerrar la
página y la reserva debe vencer igualmente.

------------------------------------------------------------------------

## 8. Modelo de datos MySQL

Base de datos: `devsoluciones_rifas`\
Motor: InnoDB (se recomienda MySQL 8.0+ por soporte de `SKIP LOCKED` y
restricciones `CHECK`)\
Codificación: `utf8mb4`\
Collation sugerida: `utf8mb4_unicode_ci`

### 8.1 Tablas principales

  -----------------------------------------------------------------------
  Tabla                               Propósito
  ----------------------------------- -----------------------------------
  `usuarios_admin`                    Usuarios internos, roles y estado.

  `rifas`                             Configuración general, numeración y
                                      reglamento de cada rifa.

  `rifa_imagenes`                     Galería de imágenes públicas por
                                      rifa.

  `premios`                           Uno o varios premios por rifa.

  `participantes`                     Datos de contacto de los
                                      compradores.

  `reservas`                          Solicitudes temporales, token de
                                      acceso y consentimiento legal por
                                      participación.

  `numeros`                           Inventario de números por rifa.

  `reserva_numeros`                   Relación entre reservas y números
                                      con precio histórico.

  `pagos`                             Reportes de transferencias,
                                      idempotencia y metadatos del
                                      comprobante.

  `configuracion_pagos`               Datos públicos de medios de pago
                                      (Nequi y Bre-B).

  `configuracion_general`             Configuración de WhatsApp, textos
                                      de instrucciones, plantillas y
                                      parámetros generales.

  `sorteos`                           Mecanismo, resultado, ganador,
                                      evidencia y acta.

  `autorizaciones`                    Operador, resolución y documentos
                                      legales de autorización.

  `auditoria`                         Registro inmutable de acciones
                                      administrativas.
  -----------------------------------------------------------------------

### 8.2 SQL inicial

El siguiente SQL es el punto de partida para el esquema y debe
gestionarse mediante migraciones versionadas desde el inicio del
proyecto.

``` sql
CREATE DATABASE IF NOT EXISTS devsoluciones_rifas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE devsoluciones_rifas;

CREATE TABLE usuarios_admin (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('SUPER_ADMIN','ADMIN','OPERADOR') NOT NULL DEFAULT 'OPERADOR',
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rifas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  descripcion TEXT NULL,
  categoria VARCHAR(100) NULL,
  imagen_principal VARCHAR(500) NULL,
  precio_numero DECIMAL(12,2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'COP',
  cantidad_numeros INT UNSIGNED NOT NULL,
  numero_inicial INT UNSIGNED NOT NULL DEFAULT 0,
  numero_final INT UNSIGNED NOT NULL,
  digitos_formato TINYINT UNSIGNED NOT NULL DEFAULT 3,
  loteria_mecanismo VARCHAR(200) NULL,
  reglamento_url VARCHAR(500) NULL,
  reglamento_version VARCHAR(50) NULL,
  fecha_inicio DATETIME NULL,
  fecha_cierre DATETIME NULL,
  fecha_sorteo DATETIME NULL,
  estado ENUM(
    'BORRADOR','EN_REVISION','PUBLICADA','PAUSADA',
    'CERRADA','FINALIZADA','CANCELADA'
  ) NOT NULL DEFAULT 'BORRADOR',
  reserva_minutos INT UNSIGNED NOT NULL DEFAULT 15,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rifas_estado (estado),
  INDEX idx_rifas_fechas (fecha_inicio, fecha_cierre)
) ENGINE=InnoDB;

CREATE TABLE rifa_imagenes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rifa BIGINT UNSIGNED NOT NULL,
  imagen_url VARCHAR(500) NOT NULL,
  orden INT UNSIGNED NOT NULL DEFAULT 0,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rifa_imagenes_rifa FOREIGN KEY (id_rifa)
    REFERENCES rifas(id),
  INDEX idx_rifa_imagenes_orden (id_rifa, orden)
) ENGINE=InnoDB;

CREATE TABLE premios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rifa BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  marca VARCHAR(100) NULL,
  modelo VARCHAR(150) NULL,
  descripcion TEXT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  valor_comercial DECIMAL(12,2) NULL,
  imagen_url VARCHAR(500) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_premios_rifa FOREIGN KEY (id_rifa)
    REFERENCES rifas(id)
) ENGINE=InnoDB;

CREATE TABLE participantes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombres_completos VARCHAR(200) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  correo VARCHAR(190) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_participantes_whatsapp (whatsapp)
) ENGINE=InnoDB;

CREATE TABLE reservas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  token_acceso CHAR(64) NOT NULL UNIQUE,
  id_rifa BIGINT UNSIGNED NOT NULL,
  id_participante BIGINT UNSIGNED NOT NULL,
  cantidad_numeros INT UNSIGNED NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  estado ENUM(
    'ACTIVA','PENDIENTE_VERIFICACION','COMPLETADA',
    'EXPIRADA','CANCELADA'
  ) NOT NULL DEFAULT 'ACTIVA',
  acepta_reglamento BOOLEAN NOT NULL DEFAULT FALSE,
  reglamento_version VARCHAR(50) NULL,
  autoriza_datos BOOLEAN NOT NULL DEFAULT FALSE,
  consentimiento_fecha DATETIME NOT NULL,
  consentimiento_ip VARCHAR(45) NULL,
  fecha_reserva DATETIME NOT NULL,
  fecha_vencimiento DATETIME NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservas_rifa FOREIGN KEY (id_rifa) REFERENCES rifas(id),
  CONSTRAINT fk_reservas_participante FOREIGN KEY (id_participante)
    REFERENCES participantes(id),
  INDEX idx_reservas_vencimiento (estado, fecha_vencimiento)
) ENGINE=InnoDB;

CREATE TABLE numeros (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rifa BIGINT UNSIGNED NOT NULL,
  numero INT UNSIGNED NOT NULL,
  estado ENUM('DISPONIBLE','PENDIENTE','VENDIDO')
    NOT NULL DEFAULT 'DISPONIBLE',
  id_reserva BIGINT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_rifa_numero UNIQUE (id_rifa, numero),
  CONSTRAINT fk_numeros_rifa FOREIGN KEY (id_rifa) REFERENCES rifas(id),
  CONSTRAINT fk_numeros_reserva FOREIGN KEY (id_reserva) REFERENCES reservas(id),
  INDEX idx_numeros_estado (id_rifa, estado)
) ENGINE=InnoDB;

CREATE TABLE reserva_numeros (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reserva BIGINT UNSIGNED NOT NULL,
  id_numero BIGINT UNSIGNED NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  CONSTRAINT uq_reserva_numero UNIQUE (id_reserva, id_numero),
  CONSTRAINT fk_rn_reserva FOREIGN KEY (id_reserva) REFERENCES reservas(id),
  CONSTRAINT fk_rn_numero FOREIGN KEY (id_numero) REFERENCES numeros(id)
) ENGINE=InnoDB;

CREATE TABLE pagos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  id_reserva BIGINT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(64) NULL UNIQUE,
  medio_pago ENUM('NEQUI','BREB') NOT NULL,
  valor_esperado DECIMAL(12,2) NOT NULL,
  valor_reportado DECIMAL(12,2) NULL,
  comprobante_url VARCHAR(500) NULL,
  comprobante_nombre_original VARCHAR(255) NULL,
  comprobante_mime VARCHAR(100) NULL,
  comprobante_tamano_bytes INT UNSIGNED NULL,
  comprobante_subido_en DATETIME NULL,
  referencia_transferencia VARCHAR(150) NULL,
  estado ENUM('PENDIENTE','APROBADO','RECHAZADO','REQUIERE_REVISION')
    NOT NULL DEFAULT 'PENDIENTE',
  observaciones TEXT NULL,
  revisado_por BIGINT UNSIGNED NULL,
  fecha_solicitud DATETIME NOT NULL,
  fecha_revision DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_reserva FOREIGN KEY (id_reserva) REFERENCES reservas(id),
  CONSTRAINT fk_pagos_admin FOREIGN KEY (revisado_por) REFERENCES usuarios_admin(id),
  INDEX idx_pagos_reserva (id_reserva),
  INDEX idx_pagos_estado (estado),
  INDEX idx_pagos_fecha (fecha_solicitud)
) ENGINE=InnoDB;

CREATE TABLE configuracion_pagos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  medio ENUM('NEQUI','BREB') NOT NULL,
  titular VARCHAR(150) NULL,
  numero_celular VARCHAR(20) NULL,
  entidad VARCHAR(100) NULL,
  llave VARCHAR(150) NULL,
  imagen_url VARCHAR(500) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE configuracion_general (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  whatsapp_comprobantes VARCHAR(20) NOT NULL,
  whatsapp_soporte VARCHAR(20) NULL,
  instrucciones_whatsapp TEXT NULL,
  plantilla_mensaje_whatsapp TEXT NULL,
  horario_atencion VARCHAR(255) NULL,
  reserva_minutos_defecto INT UNSIGNED NOT NULL DEFAULT 15,
  actualizado_por BIGINT UNSIGNED NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_config_general_admin FOREIGN KEY (actualizado_por)
    REFERENCES usuarios_admin(id)
) ENGINE=InnoDB;

CREATE TABLE sorteos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rifa BIGINT UNSIGNED NOT NULL,
  nombre_loteria VARCHAR(150) NULL,
  fecha_sorteo DATETIME NOT NULL,
  resultado_oficial VARCHAR(100) NULL,
  numero_ganador INT UNSIGNED NULL,
  id_numero_ganador BIGINT UNSIGNED NULL,
  evidencia_url VARCHAR(500) NULL,
  acta_url VARCHAR(500) NULL,
  observaciones TEXT NULL,
  registrado_por BIGINT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sorteos_rifa FOREIGN KEY (id_rifa) REFERENCES rifas(id),
  CONSTRAINT fk_sorteos_numero FOREIGN KEY (id_numero_ganador)
    REFERENCES numeros(id),
  CONSTRAINT fk_sorteos_admin FOREIGN KEY (registrado_por)
    REFERENCES usuarios_admin(id)
) ENGINE=InnoDB;

CREATE TABLE autorizaciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rifa BIGINT UNSIGNED NOT NULL,
  operador VARCHAR(200) NULL,
  entidad_autorizadora VARCHAR(200) NULL,
  numero_resolucion VARCHAR(100) NULL,
  fecha_autorizacion DATE NULL,
  documento_url VARCHAR(500) NULL,
  estado ENUM('PENDIENTE','APROBADA','RECHAZADA')
    NOT NULL DEFAULT 'PENDIENTE',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_autorizaciones_rifa FOREIGN KEY (id_rifa)
    REFERENCES rifas(id)
) ENGINE=InnoDB;

CREATE TABLE auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT UNSIGNED NULL,
  accion VARCHAR(100) NOT NULL,
  tabla_afectada VARCHAR(100) NULL,
  registro_id BIGINT UNSIGNED NULL,
  detalle JSON NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_admin FOREIGN KEY (id_usuario)
    REFERENCES usuarios_admin(id),
  INDEX idx_auditoria_fecha (fecha)
) ENGINE=InnoDB;
```

### 8.3 Ajustes necesarios antes de producción

El esquema anterior debe evolucionar mediante migraciones controladas.
Antes de desplegar a producción se debe:

-   Fijar la zona horaria de la sesión MySQL en UTC (`SET time_zone = '+00:00'`)
    para que `CURRENT_TIMESTAMP` sea consistente con `timezone: "Z"` en
    Node.js, y presentar fechas al usuario en `America/Bogota`.
-   Implementar transacciones y bloqueos de filas ordenados
    (`SELECT ... FOR UPDATE`) para impedir que un número quede asociado
    a dos reservas activas y evitar *deadlocks*.
-   Impedir múltiples pagos `PENDIENTE` simultáneos sobre una misma
    reserva (validación transaccional + `idempotency_key`).
-   Conservar el precio unitario histórico en `reserva_numeros` y el
    consentimiento legal por participación en `reservas` (cumplimiento
    Ley 1581 de 2012).
-   Definir el tratamiento administrativo de reembolsos, pagos parciales
    y discrepancias entre valor esperado y reportado.
-   Agregar índices y restricciones adicionales según el perfil de
    consultas reales.
-   Diseñar política de retención, anonimización y eliminación de datos
    personales.

------------------------------------------------------------------------

## 9. Arquitectura del backend Node.js

### 9.1 Dependencias sugeridas

``` bash
npm install express mysql2 dotenv cors helmet cookie-parser
npm install bcrypt jsonwebtoken
npm install multer file-type sharp
npm install express-rate-limit
npm install zod
npm install pino pino-http
npm install node-cron
npm install exceljs
```

Dependencias de desarrollo:

``` bash
npm install -D nodemon
```

`file-type` y `sharp` se utilizan para verificar el contenido real
(*magic bytes*) de los comprobantes e imágenes y eliminar metadatos EXIF
antes de almacenarlos. Se recomienda fijar versiones y mantener un
archivo de bloqueo (`package-lock.json`).

### 9.2 Estructura de carpetas

``` text
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── rifaController.js
│   │   ├── numeroController.js
│   │   ├── reservaController.js
│   │   ├── participanteController.js
│   │   ├── pagoController.js
│   │   ├── configuracionController.js
│   │   └── adminController.js
│   ├── migrations/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── reservaService.js
│   │   ├── pagoService.js
│   │   ├── storageService.js
│   │   └── whatsappService.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── csrfMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── errorMiddleware.js
│   ├── jobs/
│   │   └── liberarReservas.js
│   ├── validators/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── public_uploads/
├── private_uploads/
└── package.json
```

En producción, `private_uploads` debe estar fuera del directorio público
y servirse exclusivamente mediante rutas autenticadas (a través de
`storageService.js`, que además facilita migrar a S3 o Cloudflare R2).
Las credenciales y archivos `.env` nunca deben subirse a Git.

### 9.3 Conexión MySQL

Utilizar un pool de conexiones forzando UTC:

``` javascript
import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z"
});
```

Al inicializar conexiones del pool (o al configurar el servidor MySQL),
asegurar `SET time_zone = '+00:00'` para que `CURRENT_TIMESTAMP` coincida
con UTC. La configuración real de Hostinger debe tomarse del panel de
alojamiento. No asumir que el host MySQL es `localhost`; puede ser un
hostname específico.

### 9.4 Endpoints de API

#### Públicos

  Método   Ruta                           Descripción
  -------- ------------------------------ ------------------------------------------
  GET      `/api/rifas`                   Listar rifas publicadas
  GET      `/api/rifas/:slug`             Detalle de una rifa, premios y galería
  GET      `/api/rifas/:id/numeros`       Inventario de números (paginable/filtrable)
  GET      `/api/configuracion/publica`   Medios de pago activos, WhatsApp y textos
  POST     `/api/reservas`                Crear reserva (devuelve `codigo` y `token_acceso`)
  GET      `/api/reservas/:token`         Consultar reserva por `token_acceso` (PII enmascarada)
  POST     `/api/pagos`                   Reportar transferencia y comprobante (requiere `token_acceso` e `Idempotency-Key`)

#### Administrativos

  Método   Ruta                                         Descripción
  -------- -------------------------------------------- ----------------------------------------
  POST     `/api/admin/auth/login`                      Inicio de sesión (cookie `HttpOnly` / sesión)
  POST     `/api/admin/auth/logout`                     Cierre y revocación de sesión
  GET      `/api/admin/dashboard`                       Indicadores (reportado vs verificado)
  GET      `/api/admin/rifas`                           Listar todas las rifas
  POST     `/api/admin/rifas`                           Crear rifa
  PUT      `/api/admin/rifas/:id`                       Editar rifa y reglamento
  PATCH    `/api/admin/rifas/:id/estado`                Cambiar estado (valida autorizaciones)
  POST     `/api/admin/rifas/:id/premios`               Gestionar premios de una rifa
  POST     `/api/admin/rifas/:id/autorizaciones`        Registrar operador y autorización legal
  POST     `/api/admin/rifas/:id/sorteo`                Registrar resultado oficial, evidencia y acta
  POST     `/api/admin/numeros/liberar`                 Liberación manual de números con motivo
  GET      `/api/admin/pagos`                           Listar pagos con filtros
  GET      `/api/admin/pagos/:id/comprobante`           Servir comprobante privado (autenticado y auditado)
  PATCH    `/api/admin/pagos/:id/aprobar`               Aprobar pago atómicamente
  PATCH    `/api/admin/pagos/:id/rechazar`              Rechazar pago o solicitar corrección
  GET      `/api/admin/participantes`                   Consultar participantes
  GET      `/api/admin/reportes`                        Consultar reportes
  GET      `/api/admin/reportes/exportar`               Exportar reportes a CSV/Excel
  GET      `/api/admin/auditoria`                       Consultar historial de auditoría
  GET      `/api/admin/usuarios`                        Listar y gestionar usuarios (`SUPER_ADMIN`)
  PUT      `/api/admin/configuracion/pagos`             Configurar medios de pago Nequi y Bre-B
  PUT      `/api/admin/configuracion/general`           Configurar WhatsApp, textos y parámetros

Todas las rutas administrativas requieren autenticación, autorización
por rol según la matriz de la sección 3.5, validación de entradas y
protección contra CSRF cuando se utilicen cookies de sesión.

------------------------------------------------------------------------

## 10. Reglas técnicas de integridad y seguridad

### 10.1 Concurrencia de números

La creación de reservas debe utilizar una transacción SQL. Un enfoque
recomendado:

1.  Eliminar duplicados y **ordenar los números solicitados en orden
    ascendente** antes de consultar la base de datos (previene
    *deadlocks* cuando dos usuarios solicitan conjuntos traslapados en
    distinto orden).
2.  Abrir conexión del pool e iniciar transacción.
3.  Seleccionar los números solicitados con `ORDER BY numero ASC` y
    `SELECT ... FOR UPDATE`.
4.  Verificar que todos pertenezcan a la rifa y estén disponibles.
5.  Crear reserva generando `codigo` legible y `token_acceso` aleatorio
    de alta entropía.
6.  Crear relaciones en `reserva_numeros` con el precio unitario vigente.
7.  Actualizar números a `PENDIENTE` y asociarlos a la reserva.
8.  Confirmar transacción.
9.  Ante cualquier error, ejecutar `ROLLBACK`.

La restricción única `(id_rifa, numero)` impide duplicar el número
dentro de una rifa, pero no reemplaza los bloqueos transaccionales.

### 10.2 Aprobación de pago y carrera con expiración

-   La aprobación debe ser idempotente y transaccional. Una solicitud ya
    aprobada no debe aprobarse de nuevo ni duplicar ventas.
-   Tanto la carga de comprobante (`POST /api/pagos`) como el job de
    expiración deben bloquear la fila en `reservas` con
    `SELECT ... FOR UPDATE` (y `SKIP LOCKED` en el job) para evitar que
    una reserva expire simultáneamente mientras se registra un
    comprobante válido.

### 10.3 Seguridad de archivos

-   Permitir solo formatos de imagen definidos (JPG, JPEG, PNG, WEBP).
-   Verificar extensión, MIME y contenido real (*magic bytes* con
    `file-type`), y re-procesar/limpiar metadatos EXIF con `sharp`.
-   Limitar tamaño.
-   Renombrar archivos con identificadores aleatorios.
-   No aceptar rutas proporcionadas por el cliente.
-   Almacenar comprobantes y documentos legales fuera de acceso público.
-   Servir comprobantes únicamente mediante endpoint autenticado y
    autorizado (`GET /api/admin/pagos/:id/comprobante`).
-   Registrar en auditoría quién consulta o descarga comprobantes.

### 10.4 Seguridad general

-   Contraseñas con Argon2id o bcrypt.
-   Cookies `HttpOnly`, `Secure` y `SameSite` para sesiones
    administrativas, con mecanismo de revocación en `logout` (sesión en
    base de datos o lista de revocación de refresh tokens).
-   Protección contra IDOR en rutas públicas de reserva mediante
    `token_acceso` de alta entropía y enmascaramiento de datos
    personales.
-   Protección CSRF cuando corresponda.
-   Helmet y política CORS restrictiva.
-   Rate limiting en login y endpoints sensibles (`POST /api/reservas`,
    `POST /api/pagos`, `GET /api/reservas/:token`).
-   Consultas parametrizadas.
-   Validación de datos en backend.
-   Secretos en variables de entorno.
-   HTTPS obligatorio.
-   Backups automáticos y pruebas de restauración.
-   Auditoría de aprobación, rechazo, liberación y cambios de
    configuración.

------------------------------------------------------------------------

## 11. Configuración de WhatsApp

La configuración (tabla `configuracion_general`) debe permitir
administrar:

-   Número internacional para comprobantes (formato E.164 sin `+`, por
    ejemplo `573001234567`).
-   Número de atención al cliente.
-   Texto de instrucciones.
-   Plantilla del mensaje prellenado.
-   Horarios o indicaciones de atención, si aplica.

El enlace se construye en el frontend (en el Paso 2, tras finalizar la
solicitud) con los datos públicos recibidos desde la API:

``` javascript
const mensaje = `
Hola, he realizado el pago de mi participación.

Rifa: ${rifa}
Nombre: ${participante}
Números: ${numeros.join(", ")}
Valor: ${valor}
Código de solicitud: ${codigo}
`;

// whatsappInternacional ya incluye el indicativo de país sin '+', ej: "573001234567"
const url = `https://wa.me/${whatsappInternacional}?text=${encodeURIComponent(mensaje.trim())}`;
```

El número debe normalizarse y validarse en backend. No incluir el signo
`+`, espacios ni guiones ni anteponer un indicativo fijo en el frontend
para evitar duplicar el código de país (por ejemplo `5757...`).

El botón de WhatsApp no debe marcar por sí mismo el pago como reportado
ni como aprobado.

------------------------------------------------------------------------

## 12. Almacenamiento de imágenes y archivos

No almacenar imágenes como BLOB en MySQL para este proyecto.

Separar estrictamente los archivos **públicos** (imágenes de catálogo y
premios, servibles con caché HTTP) de los archivos **privados**
(comprobantes, autorizaciones y actas, accesibles solo mediante
endpoints autenticados y auditados). Abstraer el almacenamiento detrás
de un servicio (`storageService.js`) que permita operar inicialmente en
disco local (VPS) y migrar sin cambios de lógica a almacenamiento de
objetos compatible con S3 (AWS S3, Cloudflare R2, Backblaze B2).

En MySQL se conserva:

-   Ruta interna o clave del objeto.
-   Nombre original saneado.
-   Tipo MIME verificado.
-   Tamaño en bytes.
-   Fecha de carga.
-   Usuario o participante que lo cargó.
-   Relación con rifa, premio, sorteo o pago.

Ejemplo de organización:

``` text
public_uploads/
├── rifas/
├── premios/
└── pagos_qr/

private_uploads/
├── comprobantes/
├── autorizaciones/
└── actas_sorteo/
```

Los comprobantes y documentos privados nunca deben alojarse en el
directorio público ni exponerse mediante URL predecible.

------------------------------------------------------------------------

## 13. Panel administrativo

El panel administrativo también debe ser **completamente responsivo** para
que el equipo pueda verificar comprobantes, aprobar o rechazar pagos y
consultar indicadores desde cualquier teléfono móvil o tablet, no solo
desde escritorio:

-   Navegación adaptable mediante menú lateral colapsable (*drawer*) en
    móviles y barra lateral fija en escritorio.
-   Tablas de pagos, rifas y participantes que se transformen en tarjetas
    apiladas en pantallas pequeñas (o con contenedor de desplazamiento
    horizontal controlado y columnas prioritarias visibles).
-   Visor de comprobantes adaptado a móvil con soporte de zoom táctil
    (*pinch-to-zoom*) y rotación/ajuste a pantalla.
-   Acciones de aprobar y rechazar con áreas táctiles amplias y diálogos
    de confirmación centrados o tipo hoja inferior (*bottom sheet*) para
    evitar errores al operar desde el celular.

### 13.1 Dashboard

Indicadores:

-   Rifas publicadas.
-   Rifas en borrador o revisión.
-   Total de números.
-   Números disponibles.
-   Números pendientes.
-   Números vendidos.
-   Recaudo reportado.
-   Pagos pendientes de revisión.
-   Pagos aprobados.
-   Pagos rechazados.

Distinguir claramente entre dinero reportado y dinero efectivamente
verificado.

### 13.2 Gestión de rifas

Funciones:

-   Crear y editar.
-   Cargar imágenes.
-   Agregar uno o varios premios.
-   Definir precio.
-   Definir cantidad y formato de números.
-   Configurar fechas.
-   Adjuntar reglamento.
-   Registrar operador y autorización.
-   Previsualizar.
-   Publicar solo después de las validaciones requeridas.
-   Pausar o cerrar según las reglas aplicables.

### 13.3 Gestión de números

Funciones:

-   Consultar cuadrícula.
-   Filtrar por estado.
-   Buscar número.
-   Consultar participante y reserva asociada.
-   Consultar historial.
-   Liberar números con motivo y permisos.
-   Exportar inventario.

### 13.4 Gestión de participantes

Funciones:

-   Buscar por nombre o WhatsApp.
-   Consultar participaciones.
-   Consultar reservas.
-   Consultar pagos relacionados.
-   Respetar permisos y política de datos personales.

### 13.5 Gestión de pagos

Funciones:

-   Bandeja de pendientes.
-   Vista privada del comprobante.
-   Comparar valor esperado y reportado.
-   Registrar referencia de transferencia.
-   Aprobar.
-   Rechazar con motivo.
-   Consultar historial de revisión.

### 13.6 Sorteos y resultados

Registrar el mecanismo definido en el reglamento y autorizado. Conservar
fuente del resultado oficial, fecha, evidencia y acta. El sistema no
debe inventar ni alterar el resultado.

------------------------------------------------------------------------

## 14. Reportes

Reportes recomendados:

1.  Ventas por rifa.
2.  Números vendidos, pendientes y disponibles.
3.  Recaudo reportado frente a recaudo verificado.
4.  Pagos por medio de pago.
5.  Pagos pendientes, aprobados y rechazados.
6.  Participantes y cantidad de números adquiridos.
7.  Reservas expiradas.
8.  Historial de cambios administrativos.
9.  Resultado y entrega del premio.

Permitir exportar CSV o Excel según las necesidades administrativas.

------------------------------------------------------------------------

## 15. Despliegue en Hostinger

La viabilidad del despliegue depende del plan contratado. Antes de
iniciar, verificar en Hostinger:

-   Que el plan permita ejecutar aplicaciones Node.js persistentes.
-   Versión de Node.js disponible.
-   Método de despliegue y reinicio del proceso.
-   Variables de entorno.
-   Hostname, puerto, usuario y nombre de la base MySQL.
-   Límites de conexiones y almacenamiento.
-   Tareas cron disponibles.
-   Certificado SSL.
-   Política de backups.

Si el plan compartido no permite un proceso Node.js persistente o tareas
programadas confiables, será necesario utilizar un plan compatible, VPS
u otro entorno de ejecución. No asumir que todos los planes de Hostinger
soportan lo mismo.

### Dominios sugeridos

  Subdominio                  Uso
  --------------------------- ----------------------
  `devsoluciones.com`         Sitio corporativo
  `rifas.devsoluciones.com`   Portal público
  `api.devsoluciones.com`     Backend
  `admin.devsoluciones.com`   Panel administrativo

Se puede comenzar con el frontend y API bajo el mismo dominio y separar
subdominios más adelante. La separación requiere DNS, SSL, CORS y
configuración del servidor.

### Variables de entorno de ejemplo

``` env
NODE_ENV=production
PORT=3000

DB_HOST=HOST_MYSQL_HOSTINGER
DB_PORT=3306
DB_NAME=devsoluciones_rifas
DB_USER=USUARIO_MYSQL
DB_PASSWORD=CONTRASENA_SEGURA

JWT_SECRET=SECRETO_LARGO_Y_ALEATORIO
APP_URL=https://rifas.devsoluciones.com
API_URL=https://api.devsoluciones.com

UPLOAD_MAX_MB=5
TIMEZONE=America/Bogota
```

Este archivo es ilustrativo. No incluir valores reales ni subir `.env` a
GitHub.

------------------------------------------------------------------------

## 16. Frontend React y diseño responsivo (Mobile-First)

### 16.1 Estructura del frontend React

``` text
frontend/
├── public/
│   ├── images/
│   └── logos/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── rifa/
│   │   ├── numeros/
│   │   ├── formularios/
│   │   └── pagos/
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Home.jsx
│   │   │   ├── Rifas.jsx
│   │   │   ├── DetalleRifa.jsx
│   │   │   ├── SeleccionNumeros.jsx
│   │   │   ├── RegistroParticipante.jsx
│   │   │   └── Pago.jsx
│   │   └── admin/
│   │       ├── Dashboard.jsx
│   │       ├── GestionRifas.jsx
│   │       ├── GestionNumeros.jsx
│   │       ├── Participantes.jsx
│   │       ├── GestionPagos.jsx
│   │       ├── Sorteos.jsx
│   │       └── Configuracion.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── rifasService.js
│   │   ├── numerosService.js
│   │   ├── reservasService.js
│   │   └── pagosService.js
│   ├── hooks/
│   ├── context/
│   ├── routes/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

### 16.2 Lineamientos de diseño responsivo para dispositivos móviles

Dado que la mayoría de participantes accederán desde teléfonos celulares
(incluidos enlaces abiertos desde WhatsApp, Instagram o Facebook), toda
la interfaz debe construirse bajo un enfoque **Mobile-First** con
Tailwind CSS 4, garantizando compatibilidad en cualquier tamaño de
pantalla y navegador móvil.

#### Cobertura de dispositivos y breakpoints

  Breakpoint Tailwind   Ancho mínimo   Dispositivos objetivo              Comportamiento esperado
  --------------------- -------------- ---------------------------------- ----------------------------------------------------
  Base (sin prefijo)    `320px`        Móviles compactos y plegables      Diseño de 1 columna, controles táctiles de ancho
                                       cerrados (`320px`--`375px`)        completo, cuadrícula compacta sin scroll horizontal.
  `sm:`                 `640px`        Móviles grandes y modo             Ajuste de tarjetas y cuadrícula a mayor densidad,
                                       horizontal (*landscape*)           formularios optimizados.
  `md:`                 `768px`        Tablets y plegables abiertos       Catálogo en 2 columnas, cabecera ampliada y paneles
                                                                          divididos.
  `lg:`                 `1024px`       Laptops y tablets horizontales     Catálogo en 3 columnas, barra lateral fija en admin.
  `xl:` / `2xl:`        `1280px+`      Monitores de escritorio            Contenedor centrado con ancho máximo controlado.

#### Reglas obligatorias de adaptación móvil

1.  **Viewport y áreas seguras:**
    -   Configurar correctamente `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
    -   Utilizar unidades dinámicas (`dvh` / `svh`) en lugar de `100vh`
        para evitar cortes provocados por la barra de direcciones móvil
        en iOS Safari y Android Chrome.
    -   Respetar *notch*, islas dinámicas y barras de gestos mediante
        `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`,
        especialmente en cabeceras y barras fijas inferiores.
2.  **Cero desbordamiento horizontal:**
    -   Ninguna vista pública ni administrativa debe generar scroll
        horizontal involuntario de la página en anchos desde `320px`.
    -   Textos largos (títulos, códigos, llaves Bre-B, correos) deben
        aplicar quiebre de línea controlado (`break-words` / `truncate`).
3.  **Ergonomía táctil y formularios móviles:**
    -   Todos los botones, enlaces, checkboxes y celdas interactivas
        deben tener un área táctil mínima de `44 x 44 px` y espaciado
        suficiente entre elementos.
    -   Los campos de formulario deben usar tamaño de fuente mínimo de
        `16px` para evitar el zoom automático no deseado en iOS Safari.
    -   Definir atributos semánticos de teclado móvil: `inputMode="tel"`
        y `autoComplete="tel"` para WhatsApp, `inputMode="email"` para
        correo, `inputMode="numeric"` para búsqueda de números o valores.
    -   El campo de carga de comprobante debe aceptar imágenes desde
        galería o cámara del celular y mostrar una vista previa inmediata
        del archivo seleccionado antes de enviar.
4.  **Imágenes y rendimiento en redes móviles:**
    -   Usar imágenes responsivas con `aspect-ratio` definido para evitar
        saltos de diseño (*Cumulative Layout Shift*), `loading="lazy"` en
        tarjetas fuera de vista y formatos optimizados (WEBP/AVIF o
        compresión adecuada).
    -   Cargar la interfaz de manera ágil en conexiones móviles 3G/4G,
        minimizando el peso del bundle inicial con *code splitting*
        (separando el código del panel administrativo del portal público).
5.  **Navegación y compatibilidad de navegadores móviles:**
    -   Verificar funcionamiento completo en **iOS Safari**, **Android
        Chrome**, **Samsung Internet** y navegadores integrados
        (*in-app browsers* de WhatsApp, Instagram y Facebook), asegurando
        que el enlace `https://wa.me/...`, el copiado al portapapeles
        (con respaldo si `navigator.clipboard` no está disponible) y la
        carga de archivos operen sin bloqueos.
    -   Soportar correctamente cambios de orientación vertical
        (*portrait*) y horizontal (*landscape*) sin perder la selección
        de números ni los datos del formulario.
    -   Mantener contraste de color accesible (WCAG AA) y no depender
        únicamente del color para diferenciar estados de los números
        (acompañar con leyenda clara, iconos o estilos diferenciados).

------------------------------------------------------------------------

## 17. Fases de desarrollo

  Fase                 Entregable
  -------------------- ----------------------------------------------
  1\. Preparación      Repositorio, React, Vite, Tailwind y entorno
  2\. Base de datos    MySQL, tablas, relaciones y migraciones
  3\. Backend          Express, conexión, autenticación y API
  4\. Administración   Dashboard, roles y configuración
  5\. Rifas            CRUD, premios, fechas y estados
  6\. Números          Cuadrícula, selección y disponibilidad
  7\. Reservas         Transacciones, vencimiento y liberación
  8\. Participantes    Registro y validaciones
  9\. Pagos            Comprobantes, WhatsApp y aprobación manual
  10\. Reportes        Indicadores, filtros y exportación
  11\. Seguridad       Pruebas, auditoría, backups y permisos
  12\. Publicación     Despliegue y pruebas de aceptación

------------------------------------------------------------------------

## 18. Pruebas de aceptación

Antes de producción, comprobar como mínimo:

-   Dos participantes intentan reservar conjuntos de números traslapados
    en distinto orden simultáneamente: no ocurren *deadlocks* y ningún
    número queda doblemente asignado.
-   Una selección de varios números falla completamente si uno no está
    disponible.
-   Una reserva sin pago reportado vence a los 15 minutos y libera los
    números; si un comprobante entra al mismo tiempo que el job de
    expiración, la transacción resuelve un único resultado consistente.
-   Una reserva con pago reportado no se libera automáticamente.
-   No es posible consultar ni adjuntar comprobantes a una reserva ajena
    sin su `token_acceso` válido.
-   Un participante no puede aprobar su pago ni enviar solicitudes
    duplicadas con la misma clave de idempotencia.
-   El comprobante no es accesible públicamente y solo se sirve por
    endpoint autenticado y auditado; archivos falsos con extensión de
    imagen son rechazados por validación de *magic bytes*.
-   Un administrador no puede aprobar dos veces la misma solicitud.
-   La aprobación cambia pago, reserva y números de forma atómica.
-   Un rechazo exige motivo y aplica la transición correcta
    (`RECHAZADO` liberando números o `REQUIERE_REVISION` con prórroga).
-   El flujo de pago exige finalizar la solicitud antes de mostrar el
    botón principal de WhatsApp; el enlace usa el número internacional
    configurado sin duplicar el indicativo de país.
-   El mensaje contiene rifa, participante, números, valor y código de
    solicitud.
-   El total se calcula en el servidor.
-   Los precios históricos de la reserva y el consentimiento legal por
    participación no cambian si luego se modifica la rifa o el
    reglamento.
-   Las operaciones críticas y la matriz de permisos por rol
    (`SUPER_ADMIN`, `ADMIN`, `OPERADOR`) se validan en backend y quedan
    en auditoría.
-   Se puede restaurar una copia de seguridad.
-   La interfaz pública y el panel administrativo funcionan correctamente
    en cualquier dispositivo móvil (desde `320px`--`360px` hasta pantallas
    grandes, tablets y escritorio), en orientación vertical y horizontal,
    sin desbordamiento horizontal ni elementos cortados.
-   En iOS Safari, Android Chrome y navegadores integrados (WhatsApp /
    Instagram / Facebook) funcionan sin fallos la selección táctil de
    números, el botón de copiar datos de pago, la carga de comprobante
    desde galería o cámara y la apertura del enlace de WhatsApp.
-   Los formularios móviles abren el teclado adecuado (`tel`, `email`,
    `numeric`) y no provocan zoom forzado en iOS.

------------------------------------------------------------------------

## 19. Decisiones pendientes antes de iniciar el desarrollo

Estos puntos deben confirmarse durante el levantamiento técnico:

1.  **Plan de Hostinger:** confirmar si permite Node.js persistente,
    cron y conexiones MySQL requeridas.
2.  **Dominio definitivo:** confirmar el dominio exacto y los
    subdominios disponibles.
3.  **Numeración:** definir si todas las rifas usan dos o tres dígitos o
    si el formato se configura por rifa.
4.  **Compras múltiples:** confirmar límite de números por participante
    y por reserva.
5.  **Participantes repetidos:** definir si se reutiliza el registro por
    WhatsApp o se crea un registro por compra.
6.  **Pagos parciales o duplicados:** definir el procedimiento
    administrativo.
7.  **Expiración con comprobante:** establecer plazo de revisión y
    política de liberación o resolución.
8.  **WhatsApp:** confirmar el número que recibirá los comprobantes.
9.  **Medios de pago:** confirmar titular, entidad, número Nequi y llave
    Bre-B.
10. **Operación legal:** confirmar operador, autorización y reglamento
    antes de habilitar ventas reales.

------------------------------------------------------------------------

## 20. Alcance de la primera versión (MVP)

La primera versión debe incluir:

-   Portal público con diseño responsivo (*mobile-first*) para cualquier
    dispositivo móvil, tablet y escritorio.
-   Catálogo de rifas.
-   Detalle de rifa.
-   Cuadrícula de números adaptable a pantallas táctiles.
-   Registro de participantes.
-   Reserva de 15 minutos.
-   Pantalla de pago Nequi y Bre-B optimizada para móvil.
-   Carga privada del comprobante desde cámara, galería o archivo.
-   Instrucción y enlace a WhatsApp.
-   Solicitud pendiente de verificación.
-   Panel administrativo responsivo.
-   Aprobación y rechazo manual.
-   Cambio de número a vendido únicamente al aprobar.
-   Configuración de datos de pago y WhatsApp.
-   Auditoría básica.

El MVP debe probarse inicialmente con rifas ficticias y pagos simulados.
La comercialización real se habilitará únicamente después de verificar
los requisitos legales y operativos.

------------------------------------------------------------------------

**Fin del documento -- DevSoluciones Rifas v1.2**
