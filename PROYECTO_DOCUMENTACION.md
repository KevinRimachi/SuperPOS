# 📑 SUPERPOS & CAJA DIGITAL - DOCUMENTACIÓN COMPLETA

¡Bienvenido a la documentación oficial de **SuperPOS & Cafe Digital v1.2**! Este documento proporciona la especificación técnica completa, el modelo de datos, la guía de arquitectura moderna, el manual de operaciones y los pasos para llevar el proyecto a producción con total confianza.

---

## 🏛️ 1. ARQUITECTURA MODERNA Y TECNOLOGÍAS

El proyecto ha sido diseñado bajo los estándares modernos de **Next.js 16**, optimizando el rendimiento mediante **Turbopack** y garantizando robustez a través de tipado estático estricto.

### **Stack Tecnológico Principal**
- **Framework:** Next.js 16.2 (App Router con Server Components y Server Actions).
- **Compilador/Empaquetador:** Turbopack (tiempos de desarrollo ultrarrápidos).
- **Lenguaje:** TypeScript (Tipado estático seguro a nivel de frontend, backend y base de datos).
- **Base de Datos:** PostgreSQL (Neon Tech u otro proveedor) para alta disponibilidad y consistencia en la nube.
- **ORM:** Prisma ORM (Migraciones automáticas, transacciones seguras y tipado estático autogenerado).
- **Estilos:** Tailwind CSS con variables HSL personalizadas para soporte de Dark Mode/Light Mode.
- **Gráficos & Métricas:** Recharts (paneles analíticos interactivos y fluidos).
- **Iconografía:** Lucide React.
- **Efectos de Sonido:** Sintetizador haptico de audio nativo (Web Audio API).

---

## 💾 2. MODELO DE BASE DE DATOS (ESQUEMA PRISMA)

El diseño de la base de datos asegura integridad referencial total. Toda acción de caja diaria (`Movimiento`) está ligada de forma jerárquica a un turno abierto (`CierreDiario`), y las cotizaciones externas se calculan en el ingreso bruto.

### **Diagrama de Relaciones**
```mermaid
erDiagram
    CierreDiario ||--o{ Movimiento : "tiene"
    CierreDiario {
        String id PK
        DateTime fecha
        Float saldo_efectivo_entregado
        Float saldo_yape_entregado
        String estado "Abierto | Entregado"
    }
    Movimiento {
        String id PK
        DateTime fecha
        String categoria
        String tipo "Ingreso | Egreso"
        Float monto_total
        Float ingreso_efectivo
        Float ingreso_yape
        Float salida_vuelto_efectivo
        Float salida_vuelto_yape
        String id_cierre_diario FK
    }
    TareaJefe {
        String id PK
        String descripcion
        DateTime fecha_solicitud
        Float precio_final
        String estado "Pendiente | Cotizado"
    }
    LiquidacionMensual {
        String id PK
        String mes_anio "MM-YYYY"
        Float ingreso_bruto_total
        Float pago_operador
        String estado_pago "Pagado"
    }
```

---

## 🌟 3. CARACTERÍSTICAS PRINCIPALES IMPLEMENTADAS

### **A. Sistema de Alertas y Confirmaciones Personalizadas**
Para cumplir con las pautas de diseño premium, **se eliminaron todas las alertas nativas del navegador (`window.alert`, `window.confirm`)**. En su lugar, se implementaron:
- **Notificaciones Flotantes de Micro-feedback:** Toasts autodescartables con transiciones fluidas e interactividad de audio (chimes para éxito, acordes menores para fallos).
- **Modal de Confirmación Crítica Glassmorphic:** Diseñado con desenfoque de fondo premium, bordes degradados y animación de entrada y salida acelerada por hardware, para confirmaciones críticas (ej. restaurar copias de seguridad).

### **B. Control de Egresos Rápido (Gastos del Día)**
El operador o jefe puede registrar la compra de papel, tinta, materiales o almuerzos directamente desde la interfaz. 
- Los egresos restan automáticamente el balance esperado de caja.
- Permite especificar si el egreso se retiró de **Efectivo Físico** o de **Yape / QR**.
- Se guarda de forma automática en la lista de movimientos con la categoría `EGRESO: [CONCEPTO]`.

### **C. Respaldo y Restauración de Base de Datos (Backup JSON)**
Para prevenir pérdida de datos o facilitar migraciones:
- **Exportación:** Genera un archivo `.json` formateado con toda la base de datos (`CierreDiario`, `Movimiento`, `TareaJefe`, `LiquidacionMensual`) y firma de versión `1.0`.
- **Importación Segura:** Valida el esquema client-side. Antes de sobrescribir, despliega un **Modal de Confirmación Crítica** donde se le exige al usuario escribir la palabra clave `"IMPORTAR"` para evitar clics accidentales. La restauración se ejecuta en una sola transacción SQL atómica (`$transaction`) y recarga el terminal al finalizar de forma limpia.

### **D. Visualización Limitada para Operadores**
- El operador puede ingresar con su PIN (`1234`) y acceder a todas las funciones de venta (POS) y egresos rápidos.
- Puede visualizar la pestaña **Dashboard** de forma exclusiva de lectura para conocer el estado y ventas del mes, pero no tiene acceso a configuraciones críticas, cierres antiguos del jefe ni liquidaciones de pago de comisiones mensuales.

### **E. Cierres Retroactivos y Auto-Reparación de Base de Datos**
- **Cierres Atrasados:** Si se olvida cerrar la caja de turnos anteriores, el sistema detecta de forma inteligente las "cajas huérfanas", bloquea el sistema POS del día actual y obliga a realizar el arqueo de los días pasados.
- **Agrupamiento Inteligente (UTC):** Las fechas y movimientos de las cajas pasadas se consolidan visualmente utilizando formato UTC, evitando confusiones por cambios de zona horaria local.
- **Limpieza de Duplicados (Self-Healing):** El sistema cuenta con mecanismos concurrentes robustos. Si el operador recarga múltiples veces el sistema, este es capaz de detectar cajas vacías generadas accidentalmente, conservar únicamente el registro principal de operaciones y eliminar la basura transaccional automáticamente al iniciar.

---

## 🛠️ 4. GUÍA DE INSTALACIÓN Y DESPLIEGUE EN PRODUCCIÓN (VERCEL & POSTGRESQL)

### **Paso 1: Crear la Base de Datos (PostgreSQL)**
1. Crea un proyecto gratuito en [Neon.tech](https://neon.tech/) o tu proveedor de PostgreSQL favorito.
2. Copia la cadena de conexión (Connection String).

### **Paso 2: Configuración de Variables de Entorno (`.env`)**
Crea un archivo `.env` en la raíz de tu proyecto local con la URL de tu base de datos:
```env
DATABASE_URL="postgresql://usuario:password@host/db?sslmode=require"
```

### **Paso 3: Migrar la Base de Datos**
Sincroniza el esquema de Prisma con tu base de datos recién creada:
```bash
npx prisma db push
```

### **Paso 4: Subir el Código a GitHub**
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### **Paso 5: Despliegue en Vercel**
1. Entra a [Vercel](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **Add New... > Project** e importa tu repositorio.
3. En el apartado **Environment Variables**, añade la variable `DATABASE_URL` con tu cadena de conexión de Neon.
4. En **Build Command**, puedes escribir el comando de Prisma: `prisma generate && next build`.
5. Haz clic en **Deploy**. ¡Vercel compilará la aplicación y te dará tu enlace en producción en un par de minutos!

*(Para uso local, puedes seguir usando `pnpm install` seguido de `pnpm run dev` o compilar con `pnpm run build` y correr con `pnpm run start`).*

---

## 🔒 5. CREDENCIALES DE ACCESO POR DEFECTO (PINS DE SEGURIDAD)

El POS cuenta con un teclado virtual adaptativo. Los PINs de seguridad preconfigurados en la base de datos lógica son:

| Rol | PIN de Acceso | Permisos |
|---|---|---|
| **Operador (Vendedor)** | `1234` | Registrar Ventas, Gastos Rápidos (Egresos), Ver Dashboard de Ventas en modo de Solo Lectura. |
| **Administrador (Jefe)** | `0000` | Ver Historial de Cierres de Turno, Editar Estados de Tareas, Pagar Liquidaciones Mensuales, Descargar/Restaurar Backups. |

---

## 🚀 6. PLAN DE MANTENIMIENTO RECOMENDADO

1. **Backups Semanales:** Se recomienda al Administrador descargar el archivo `.json` de respaldo al finalizar cada semana laboral.
2. **Cierre de Caja Diario:** Al final de cada jornada de trabajo, el operador debe cerrar la caja diaria ingresando el efectivo físico contado en el conteo interactivo. Esto bloquea las transacciones de ese día y genera un **Ticket de Arqueo** imprimible mediante ticketera térmica.
3. **Control de Sesión:** Si la terminal se queda inactiva por más de 10 minutos (tiempo personalizable en el panel de configuración), se bloqueará automáticamente solicitando el PIN de acceso del operador o jefe nuevamente.

---
*Desarrollado con pasión para brindar la mejor experiencia digital en puntos de venta y control de caja diarios.*
