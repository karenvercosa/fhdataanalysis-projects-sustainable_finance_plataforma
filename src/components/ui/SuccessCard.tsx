import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

/** Card de confirmação exibido ao fim do cadastro. */
export function SuccessCard({
  title,
  desc,
  btnText,
  to = "/login",
}: Readonly<{
  title: string;
  desc: string;
  btnText: string;
  to?: string;
}>) {
  return (
    <>
      <div className="flex animate-in fade-in zoom-in-95 flex-col items-center gap-4 py-6 text-center duration-300">
        <img src="/sf-logo.svg" alt="Sustainable Finance" className="h-12 w-auto" />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[#8DD596]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-h2 text-white">{title}</h2>
          <p className="text-body text-white/80">{desc}</p>
        </div>
      </div>
      <Link
        to={to}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 font-semibold text-[#102823] transition-all hover:brightness-110 active:brightness-95"
      >
        {btnText}
      </Link>
    </>
  );
}
