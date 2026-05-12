import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
});


export const metadata: Metadata = {
    title: "Pode-Deixar — Encontre profissionais de confiança",
    description:
        "Conectamos você com trabalhadores qualificados através de orçamentos personalizados. Rápido, seguro e transparente.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body
                className={`${poppins.variable} antialiased`}
            >
                <TooltipProvider>{children}</TooltipProvider>
            </body>
        </html>
    );
}
