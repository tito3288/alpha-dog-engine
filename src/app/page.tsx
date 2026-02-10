export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <svg
          className="dark:invert"
          width={180}
          height={38}
          viewBox="0 0 394 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"
            fill="currentColor"
          />
          <path
            d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm202.1-.1V0h13.6v67.2l49.5-67.2h14.3L281 79.3h-14.3l36.8-50.1-20.5-29.2z"
            fill="currentColor"
          />
        </svg>
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
              src/app/page.tsx
            </code>
            .
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              className="dark:invert"
              width={20}
              height={20}
              viewBox="0 0 76 65"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
            </svg>
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            aria-hidden
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-10-7a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z"
              fill="currentColor"
            />
          </svg>
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            aria-hidden
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1-.75-.75zm1.5.75v9h10.5v-9z"
              fill="currentColor"
            />
          </svg>
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            aria-hidden
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M6.37 1.95a6.5 6.5 0 0 0-4.1 4.44L5.19 4.6zm-.89 5.69L1.7 9.3a6.5 6.5 0 0 0 5.17 5.23L5.48 7.64zm1.88-.65L10 5.76l-1.2-4.29a6.5 6.5 0 0 0-3.65 1.53zm.83 1.3L9.7 14.5a6.5 6.5 0 0 0 3.64-1.53L7.36 8.3zM10.62 14a6.5 6.5 0 0 0 4.1-4.44l-2.93 1.79zm.89-5.7 3.78-1.65a6.5 6.5 0 0 0-5.17-5.22z"
              fill="currentColor"
            />
          </svg>
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
