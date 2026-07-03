"use client";

import { useRouter } from "next/navigation";
import {
  Briefcase,
  Mail,
  MapPin,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useEffect,
} from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { updateWorkerProfileAction } from "@/lib/auth/actions";
import {
  getApiErrorMessage,
  mapApiErrorToFieldErrors,
} from "@/lib/auth/errors";
import type {
  UpdateProviderProfilePayload,
  UserProfile,
} from "@/lib/auth/types";
import { validateWorkerProfileUpdate } from "@/lib/auth/validation";

type WorkerProfilePageProps = {
  initialProfile: UserProfile | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function TabPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
}) {
  return (
    <Empty className="border border-dashed border-border/80 bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default function WorkerProfilePage({
  initialProfile,
}: WorkerProfilePageProps) {
  const router = useRouter();
  const hasProfile = !!initialProfile?.profile_id;
  const isCreateMode = !hasProfile;

  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(isCreateMode);

  const [bio, setBio] = useState(profile?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState<string>(
    profile?.hourly_rate != null ? String(profile.hourly_rate) : "",
  );
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [isAvailable, setIsAvailable] = useState(
    profile?.is_available ?? true,
  );
  const [portfolio, setPortfolio] = useState<string[]>(
    profile?.portfolio?.length ? profile.portfolio : [""],
  );

  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && skillInputRef.current) {
      skillInputRef.current.focus();
    }
  }, [isEditing, skills]);

  function resetForm() {
    setBio(profile?.bio ?? "");
    setHourlyRate(
      profile?.hourly_rate != null ? String(profile.hourly_rate) : "",
    );
    setSkills(profile?.skills ?? []);
    setIsAvailable(profile?.is_available ?? true);
    setPortfolio(profile?.portfolio?.length ? profile.portfolio : [""]);
    setSkillInput("");
    setFieldErrors({});
  }

  function addSkill(value: string) {
    const trimmed = value.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function handleSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
    if (e.key === "Backspace" && !skillInput && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  }

  function addPortfolioField() {
    setPortfolio((prev) => [...prev, ""]);
  }

  function updatePortfolio(index: number, value: string) {
    setPortfolio((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function removePortfolio(index: number) {
    setPortfolio((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPayload(): UpdateProviderProfilePayload {
    const cleanedPortfolio = portfolio
      .map((url) => url.trim())
      .filter(Boolean);
    return {
      bio: bio || undefined,
      hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      skills: skills.length > 0 ? skills : undefined,
      portfolio: cleanedPortfolio.length > 0 ? cleanedPortfolio : undefined,
      isAvailable,
    };
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = buildPayload();
      const validation = validateWorkerProfileUpdate(payload);

      if (!validation.ok) {
        setFieldErrors(validation.errors);
        return;
      }

      const result = await updateWorkerProfileAction(payload);
      setProfile(result.user);
      setIsEditing(false);

      toast.success(result.message);
      router.refresh();
    } catch (err) {
      const mapped = mapApiErrorToFieldErrors(err);
      if (mapped) {
        setFieldErrors(mapped);
      }
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEdit = () => {
    setFieldErrors({});
    if (isEditing) {
      resetForm();
    }
    setIsEditing((current) => !current);
  };

  const readOnly = !isEditing;
  const displayRating = profile?.rating ?? 0;
  const displayReviews = profile?.total_reviews ?? 0;
  const nonEmptyPortfolio = (profile?.portfolio ?? []).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="size-16 border border-border/80">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.complete_name}
              />
            ) : null}
            <AvatarFallback className="bg-secondary/10 text-lg font-semibold text-secondary">
              {profile ? getInitials(profile.complete_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {profile?.complete_name ?? "Novo Profissional"}
              </h1>
              <Badge
                variant="outline"
                className="border-secondary/40 text-secondary"
              >
                Profissional
              </Badge>
            </div>
            {hasProfile && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">
                  {displayRating.toFixed(1)}
                </span>
                <span>({displayReviews} avaliações)</span>
              </div>
            )}
          </div>
        </div>

        {!isCreateMode && (
          <Button
            type="button"
            variant={isEditing ? "outline" : "default"}
            className={
              isEditing
                ? undefined
                : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            }
            onClick={handleToggleEdit}
          >
            {isEditing ? "Cancelar edição" : "Editar perfil"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="info" className="gap-6">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {isCreateMode
                  ? "Criar perfil profissional"
                  : "Dados profissionais"}
              </CardTitle>
              <CardDescription>
                {isCreateMode
                  ? "Preencha suas informações para começar a oferecer serviços."
                  : "Gerencie suas informações pessoais e profissionais."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field className="md:col-span-2">
                    <FieldLabel>Nome completo</FieldLabel>
                    <Input
                      value={profile?.complete_name ?? ""}
                      readOnly
                      className="bg-muted/40"
                    />
                  </Field>

                  <Field className="md:col-span-2">
                    <FieldLabel>E-mail</FieldLabel>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={profile?.email ?? ""}
                        readOnly
                        className="bg-muted/40 pl-9"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Telefone</FieldLabel>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={profile?.phone ?? ""}
                        readOnly
                        className="bg-muted/40 pl-9"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>CEP</FieldLabel>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={profile?.postal_code ?? ""}
                        readOnly
                        className="bg-muted/40 pl-9"
                      />
                    </div>
                  </Field>

                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="bio">Biografia</FieldLabel>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      readOnly={readOnly}
                      rows={4}
                      placeholder="Conte um pouco sobre sua experiência profissional..."
                      className={readOnly ? "bg-muted/40" : undefined}
                    />
                    <FieldError message={fieldErrors.bio} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="hourlyRate">
                      Valor por hora (R$)
                    </FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        readOnly={readOnly}
                        placeholder="0,00"
                        className={`pl-10 ${readOnly ? "bg-muted/40" : ""}`}
                      />
                    </div>
                    <FieldError message={fieldErrors.hourlyRate} />
                  </Field>

                  <Field>
                    <FieldLabel>Habilidades</FieldLabel>
                    {readOnly ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.length > 0 ? (
                          skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Nenhuma habilidade cadastrada
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                        {skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="flex size-3.5 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                            >
                              <span className="sr-only">Remover {skill}</span>
                              <span aria-hidden="true">&times;</span>
                            </button>
                          </Badge>
                        ))}
                        <input
                          ref={skillInputRef}
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={handleSkillKeyDown}
                          onBlur={() => addSkill(skillInput)}
                          placeholder={
                            skills.length === 0
                              ? "Digite uma habilidade e pressione Enter..."
                              : ""
                          }
                          className="min-w-16 flex-1 bg-transparent outline-none"
                        />
                      </div>
                    )}
                    <FieldError message={fieldErrors.skills} />
                  </Field>

                  <Field>
                    <FieldLabel>Disponível</FieldLabel>
                    <div className="flex items-center gap-3 pt-1">
                      <Switch
                        checked={isAvailable}
                        onCheckedChange={(checked) =>
                          setIsAvailable(checked as boolean)
                        }
                        disabled={readOnly}
                      />
                      <span className="text-sm text-muted-foreground">
                        {isAvailable
                          ? "Aceitando novos serviços"
                          : "Não disponível no momento"}
                      </span>
                    </div>
                    <FieldError message={fieldErrors.isAvailable} />
                  </Field>
                </FieldGroup>

                {(isEditing || isCreateMode) && (
                  <div className="flex justify-end gap-3">
                    {!isCreateMode && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleToggleEdit}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                      {loading ? (
                        <>
                          <Spinner className="mr-2" />
                          Salvando...
                        </>
                      ) : isCreateMode ? (
                        "Criar perfil"
                      ) : (
                        "Salvar alterações"
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {hasProfile && (
            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-destructive">
                  Zona de perigo
                </CardTitle>
                <CardDescription>
                  Excluir sua conta remove permanentemente seus dados da
                  plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" disabled>
                  <Trash2 className="mr-2 size-4" />
                  Excluir conta
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  A exclusão de conta está temporariamente indisponível.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Portfólio
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Adicione links para fotos ou portfólios dos seus trabalhos."
                  : "Links do seu portfólio."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {portfolio.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => updatePortfolio(index, e.target.value)}
                    readOnly={readOnly}
                    placeholder="https://..."
                    className={readOnly ? "bg-muted/40" : ""}
                  />
                  {isEditing && portfolio.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePortfolio(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPortfolioField}
                  className="gap-1"
                >
                  <Plus className="size-4" />
                  Adicionar link
                </Button>
              )}
              {readOnly && nonEmptyPortfolio.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Nenhum link adicionado
                </span>
              )}
              <FieldError message={fieldErrors.portfolio} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <TabPlaceholder
            icon={Star}
            title="Avaliações em breve"
            description="Em breve você poderá visualizar e responder às avaliações dos clientes."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
