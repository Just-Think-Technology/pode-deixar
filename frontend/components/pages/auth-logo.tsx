import Image from "next/image";
import Link from "next/link";

type AuthLogoProps = {
    className?: string;
};

export default function AuthLogo({ className }: AuthLogoProps) {
    return (
        <Link href="/" aria-label="Voltar para a página inicial" className={className}>
            <Image
                src="/logotipo-pode-deixar-sem-fundo.webp"
                alt="Pode-Deixar"
                width={400}
                height={80}
                className="h-32 w-auto object-contain"
                priority
            />
        </Link>
    );
}
