"use client";

import Link from "next/link";
import Image from "next/image";
import {
    Search,
    MessageSquare,
    CheckCircle2,
    Star,
    Users,
    Briefcase,
    CheckCircle,
    Menu,
    X,
    Mail,
    Phone,
    MapPin,
    LayoutGrid,
    Store,
    ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center overflow-visible">
                    <Image
                        src="/logotipo-pode-deixar-sem-fundo.webp"
                        alt="Pode-Deixar"
                        width={400}
                        height={80}
                        className="h-14 w-auto origin-left scale-[2] object-contain"
                        priority
                    />
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden items-center gap-7 md:flex">
                    <Link href="#como-funciona" className="text-sm font-medium text-gray-500 transition-colors hover:text-[#2F80ED]">
                        Como Funciona
                    </Link>
                    <Link href="#beneficios" className="text-sm font-medium text-gray-500 transition-colors hover:text-[#2F80ED]">
                        Benefícios
                    </Link>
                    <Link href="#contato" className="text-sm font-medium text-gray-500 transition-colors hover:text-[#2F80ED]">
                        Contato
                    </Link>
                </nav>

                {/* Auth buttons */}
                <div className="hidden items-center gap-2 md:flex">
                    <Link href="/select-user">
                        <Button variant="ghost" size="sm" className="font-medium text-gray-600">
                            Entrar
                        </Button>
                    </Link>
                    <Link href="/select-user">
                        <Button size="sm" className="bg-[#2F80ED] font-medium text-white hover:bg-[#2F80ED]/90">
                            Começar Grátis
                        </Button>
                    </Link>
                </div>

                {/* Mobile menu toggle */}
                <button
                    className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                >
                    {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
                    <nav className="flex flex-col gap-3 pt-3">
                        <Link href="#como-funciona" className="text-sm font-medium text-gray-500" onClick={() => setMenuOpen(false)}>
                            Como Funciona
                        </Link>
                        <Link href="#beneficios" className="text-sm font-medium text-gray-500" onClick={() => setMenuOpen(false)}>
                            Benefícios
                        </Link>
                        <Link href="#contato" className="text-sm font-medium text-gray-500" onClick={() => setMenuOpen(false)}>
                            Contato
                        </Link>
                        <Separator />
                        <Link href="/select-user">
                            <Button variant="ghost" size="sm" className="w-full justify-start text-gray-600">
                                Entrar
                            </Button>
                        </Link>
                        <Link href="/select-user">
                            <Button size="sm" className="w-full bg-[#2F80ED] text-white hover:bg-[#2F80ED]/90">
                                Começar Grátis
                            </Button>
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
    return (
        <section className="bg-[#EEF4FF] pt-28 pb-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
                    {/* Left content */}
                    <div className="flex-1">
                        <h1
                            className="mb-5 text-4xl font-bold leading-tight text-[#333333] sm:text-5xl lg:text-[52px]"
                        >
                            Encontre profissionais de confiança para qualquer serviço
                        </h1>

                        <p className="mb-8 text-base text-gray-500 sm:text-lg">
                            Conectamos você com trabalhadores qualificados através de orçamentos personalizados. Rápido, seguro e transparente.
                        </p>

                        <div className="mb-10 flex flex-col gap-3 sm:flex-row">
                            <Link href="/select-user">
                                <Button
                                    size="lg"
                                    className="gap-2 bg-[#2F80ED] px-6 text-base font-semibold text-white hover:bg-[#2F80ED]/90"
                                >
                                    <LayoutGrid className="size-5" />
                                    Contratar Serviços
                                </Button>
                            </Link>
                            <Link href="/select-user">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="gap-2 border-[#27AE60] px-6 text-base font-semibold text-[#27AE60] hover:bg-[#27AE60]/5 hover:text-[#27AE60]"
                                >
                                    <Store className="size-5" />
                                    Oferecer Serviços
                                </Button>
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-8">
                            <div>
                                <p className="text-2xl font-bold text-[#2F80ED]">
                                    10k+
                                </p>
                                <p className="text-sm text-gray-500">Profissionais</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200" />
                            <div>
                                <p className="text-2xl font-bold text-[#2F80ED]">
                                    50k+
                                </p>
                                <p className="text-sm text-gray-500">Serviços</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200" />
                            <div>
                                <p className="text-2xl font-bold text-[#2F80ED]">
                                    4.8★
                                </p>
                                <p className="text-sm text-gray-500">Avaliação</p>
                            </div>
                        </div>
                    </div>

                    {/* Right image */}
                    <div className="relative flex-1">
                        <div className="relative overflow-hidden rounded-2xl shadow-xl">
                            <Image
                                src="https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80"
                                alt="Profissional realizando serviço"
                                width={600}
                                height={480}
                                className="h-[400px] w-full object-cover lg:h-[480px]"
                                priority
                            />
                        </div>
                        {/* Floating badge */}
                        <div className="absolute bottom-6 right-6 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#27AE60]/15">
                                <CheckCircle2 className="size-5 text-[#27AE60]" />
                            </div>
                            <div className="leading-tight">
                                <p className="text-sm font-bold text-[#333333]">+500 serviços</p>
                                <p className="text-xs text-gray-400">realizados hoje</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Como Funciona ────────────────────────────────────────────────────────────

const steps = [
    {
        number: "1",
        title: "Encontre",
        description: "Navegue por profissionais qualificados em diversas categorias",
        icon: Search,
    },
    {
        number: "2",
        title: "Solicite",
        description: "Descreva seu projeto e receba orçamentos personalizados",
        icon: MessageSquare,
    },
    {
        number: "3",
        title: "Compare",
        description: "Analise propostas e escolha a melhor opção para você",
        icon: CheckCircle2,
    },
    {
        number: "4",
        title: "Avalie",
        description: "Serviço concluído, avalie e ajude outros usuários",
        icon: Star,
    },
];

function HowItWorks() {
    return (
        <section id="como-funciona" className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <h2
                        className="text-3xl font-bold text-[#333333] sm:text-4xl"
                    >
                        Como Funciona
                    </h2>
                    <p className="mt-3 text-gray-500">
                        Processo simples e transparente para conectar você ao profissional ideal
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <Card key={step.number} className="border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                                <CardContent className="flex flex-col items-center pt-8 pb-6 text-center">
                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF4FF]">
                                        <Icon className="size-6 text-[#2F80ED]" />
                                    </div>
                                    <h3
                                        className="mb-2 text-base font-bold text-[#333333]"
                                    >
                                        {step.number}. {step.title}
                                    </h3>
                                    <p className="text-sm text-gray-500">{step.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ─── Por que Pode-Deixar ──────────────────────────────────────────────────────

const clientFeatures = [
    {
        title: "Orçamentos Personalizados",
        description: "Receba propostas justas baseadas no seu projeto específico",
    },
    {
        title: "Profissionais Verificados",
        description: "Todos os trabalhadores passam por processo de verificação",
    },
    {
        title: "Avaliações Reais",
        description: "Veja feedback de outros clientes antes de contratar",
    },
    {
        title: "Comunicação Direta",
        description: "Chat integrado para tirar dúvidas e acompanhar o trabalho",
    },
];

const workerFeatures = [
    {
        title: "Controle Total de Preços",
        description: "Você define o valor justo para cada serviço",
    },
    {
        title: "Visibilidade Garantida",
        description: "Alcance milhares de clientes potenciais",
    },
    {
        title: "Gestão Simplificada",
        description: "Gerencie orçamentos e serviços em um só lugar",
    },
    {
        title: "Pagamento Seguro",
        description: "Receba com segurança através da plataforma",
    },
];

function WhyPodeDeixer() {
    return (
        <section id="beneficios" className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <h2
                        className="text-3xl font-bold text-[#333333] sm:text-4xl"
                    >
                        Por que escolher o{" "}
                        <span className="text-[#2F80ED]">Pode-Deixar?</span>
                    </h2>
                </div>

                <div className="grid gap-12 lg:grid-cols-2">
                    {/* Para Clientes */}
                    <div>
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF]">
                                <Users className="size-5 text-[#2F80ED]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#333333]">
                                Para Clientes
                            </h3>
                        </div>
                        <div className="flex flex-col gap-5">
                            {clientFeatures.map((f) => (
                                <div key={f.title} className="flex items-start gap-3">
                                    <CheckCircle className="mt-0.5 size-5 shrink-0 text-[#27AE60]" />
                                    <div>
                                        <p className="font-semibold text-[#333333]">{f.title}</p>
                                        <p className="text-sm text-gray-500">{f.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Para Profissionais */}
                    <div>
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDFBF3]">
                                <Briefcase className="size-5 text-[#27AE60]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#333333]">
                                Para Profissionais
                            </h3>
                        </div>
                        <div className="flex flex-col gap-5">
                            {workerFeatures.map((f) => (
                                <div key={f.title} className="flex items-start gap-3">
                                    <CheckCircle className="mt-0.5 size-5 shrink-0 text-[#27AE60]" />
                                    <div>
                                        <p className="font-semibold text-[#333333]">{f.title}</p>
                                        <p className="text-sm text-gray-500">{f.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CtaSection() {
    return (
        <section className="bg-[#2F80ED] py-20 text-white">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
                <h2
                    className="mb-4 text-3xl font-bold sm:text-4xl"
                >
                    Pronto para começar?
                </h2>
                <p className="mb-10 text-base text-white/80 sm:text-lg">
                    Junte-se a milhares de pessoas que já confiam no Pode-Deixar
                </p>
                <Link href="/select-user">
                    <Button
                        size="lg"
                        variant="outline"
                        className="gap-2 border-white bg-transparent px-8 text-base font-semibold text-white hover:bg-white hover:text-[#2F80ED]"
                    >
                        Começar Agora
                        <ArrowRight className="size-5" />
                    </Button>
                </Link>
            </div>
        </section>
    );
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

function Newsletter() {
    return (
        <section className="bg-[#F5F6FA] py-16">
            <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
                <h2
                    className="mb-2 text-2xl font-bold text-[#333333]"
                >
                    Fique por dentro das novidades
                </h2>
                <p className="mb-8 text-gray-500">
                    Receba dicas, promoções exclusivas e novidades direto no seu e-mail
                </p>
                <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
                    <Input
                        type="email"
                        placeholder="seu@email.com"
                        className="h-11 flex-1 bg-white text-base"
                    />
                    <Button
                        type="submit"
                        className="h-11 shrink-0 bg-[#2F80ED] px-6 font-medium text-white hover:bg-[#2F80ED]/90"
                    >
                        Inscrever
                    </Button>
                </form>
            </div>
        </section>
    );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const socialIcons = [
    {
        label: "Facebook",
        href: "#",
        svg: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
        ),
    },
    {
        label: "Instagram",
        href: "#",
        svg: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
        ),
    },
    {
        label: "Twitter",
        href: "#",
        svg: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
        ),
    },
    {
        label: "LinkedIn",
        href: "#",
        svg: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
            </svg>
        ),
    },
];

function Footer() {
    return (
        <footer id="contato" className="border-t border-gray-100 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div>
                        <Link href="/" className="flex items-center overflow-visible">
                            <Image
                                src="/logotipo-pode-deixar-sem-fundo.webp"
                                alt="Pode-Deixar"
                                width={400}
                                height={80}
                                className="h-14 w-auto origin-left scale-[2] object-contain"
                                priority
                            />
                        </Link>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                            Conectando pessoas com talento de forma simples, rápida e segura.
                        </p>
                    </div>

                    {/* Contato */}
                    <div>
                        <h4 className="mb-4 font-bold text-[#333333]">
                            Contato
                        </h4>
                        <ul className="space-y-3 text-sm text-gray-500">
                            <li className="flex items-center gap-2">
                                <Mail className="size-4 shrink-0 text-gray-400" />
                                contato@podedeixar.com
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="size-4 shrink-0 text-gray-400" />
                                (11) 99999-9999
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin className="size-4 shrink-0 text-gray-400" />
                                São Paulo, SP - Brasil
                            </li>
                        </ul>
                    </div>

                    {/* Links Rápidos */}
                    <div>
                        <h4 className="mb-4 font-bold text-[#333333]">
                            Links Rápidos
                        </h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="#como-funciona" className="text-gray-500 hover:text-[#2F80ED]">
                                    Como Funciona
                                </Link>
                            </li>
                            <li>
                                <Link href="#beneficios" className="text-gray-500 hover:text-[#2F80ED]">
                                    Benefícios
                                </Link>
                            </li>
                            <li>
                                <Link href="/select-user" className="text-gray-500 hover:text-[#2F80ED]">
                                    Cadastre-se
                                </Link>
                            </li>
                            <li>
                                <Link href="/select-user" className="text-gray-500 hover:text-[#2F80ED]">
                                    Login
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Redes Sociais */}
                    <div>
                        <h4 className="mb-4 font-bold text-[#333333]">
                            Redes Sociais
                        </h4>
                        <div className="flex gap-3">
                            {socialIcons.map(({ label, href, svg }) => (
                                <Link
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-[#2F80ED] hover:text-white"
                                >
                                    {svg}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <Separator className="my-8" />

                <p className="text-center text-sm text-gray-400">
                    © 2026 Pode-Deixar. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
    return (
        <div className="min-h-screen font-poppins">
            <Navbar />
            <main>
                <HeroSection />
                <HowItWorks />
                <WhyPodeDeixer />
                <CtaSection />
                <Newsletter />
            </main>
            <Footer />
        </div>
    );
}
