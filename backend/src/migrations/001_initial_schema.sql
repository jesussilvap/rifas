-- Migración 001: Esquema inicial DevSoluciones Rifas (v1.2)
-- Requiere MySQL 8.0+ (InnoDB, utf8mb4)

CREATE TABLE IF NOT EXISTS usuarios_admin (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('SUPER_ADMIN','ADMIN','OPERADOR') NOT NULL DEFAULT 'OPERADOR',
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sesiones_revocadas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jti VARCHAR(64) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sesiones_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rifas (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rifa_imagenes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rifa BIGINT UNSIGNED NOT NULL,
  imagen_url VARCHAR(500) NOT NULL,
  orden INT UNSIGNED NOT NULL DEFAULT 0,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rifa_imagenes_rifa FOREIGN KEY (id_rifa)
    REFERENCES rifas(id),
  INDEX idx_rifa_imagenes_orden (id_rifa, orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS premios (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS participantes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombres_completos VARCHAR(200) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  correo VARCHAR(190) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_participantes_whatsapp (whatsapp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservas (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS numeros (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserva_numeros (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reserva BIGINT UNSIGNED NOT NULL,
  id_numero BIGINT UNSIGNED NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  CONSTRAINT uq_reserva_numero UNIQUE (id_reserva, id_numero),
  CONSTRAINT fk_rn_reserva FOREIGN KEY (id_reserva) REFERENCES reservas(id),
  CONSTRAINT fk_rn_numero FOREIGN KEY (id_numero) REFERENCES numeros(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_pagos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  medio ENUM('NEQUI','BREB') NOT NULL UNIQUE,
  titular VARCHAR(150) NULL,
  numero_celular VARCHAR(20) NULL,
  entidad VARCHAR(100) NULL,
  llave VARCHAR(150) NULL,
  imagen_url VARCHAR(500) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_general (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sorteos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS autorizaciones (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
