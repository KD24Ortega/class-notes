# ClassNotes

Aplicacion de notas de clase construida con Next.js 16, React 19, TipTap y Tailwind CSS.

Las notas se guardan en `localStorage`, por lo que no necesita base de datos ni configuracion de variables de entorno para ejecutarse localmente.

## Requisitos

- Node.js 20.9 o superior
- npm

## Instalacion

1. Clona este repositorio:

```bash
git clone <URL_DEL_REPO>
```

2. Entra a la carpeta del proyecto:

```bash
cd class-notes
```

3. Instala las dependencias:

```bash
npm install
```

## Ejecutar en desarrollo

Inicia el servidor local con:

```bash
npm run dev
```

Luego abre:

```txt
http://localhost:3000
```

## Ejecutar en produccion

1. Genera el build:

```bash
npm run build
```

2. Inicia la aplicacion:

```bash
npm run start
```

## Scripts disponibles

- `npm run dev`: inicia el servidor de desarrollo con Next.js.
- `npm run build`: genera la version de produccion.
- `npm run start`: ejecuta la app en modo produccion.
- `npm run lint`: analiza el codigo con ESLint.

## Estructura basica

- `app/`: rutas y layout principal de Next.js.
- `components/`: componentes de interfaz, incluido el editor de notas.
- `lib/`: utilidades compartidas.
- `public/`: archivos estaticos.

## Notas

- Si `npm run dev` falla, verifica primero tu version de Node.js con `node -v`.
- Como las notas se guardan en el navegador, no apareceran automaticamente en otro equipo o navegador.
