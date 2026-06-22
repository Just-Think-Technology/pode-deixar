"use client";

import { useRouter } from "next/navigation";
import {
  Briefcase,
  Info,
  Mail,
  MapPin,
  Phone,
  Star,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteWorkerAccountAction,
  updateWorkerProfileAction,
} from "@/lib/auth/actions";
import {
  getApiErrorMessage,
  mapApiErrorToFieldErrors,
} from "@/lib/auth/errors";
import type { UpdateWorkerProfilePayload, UserProfile } from "@/lib/auth/types";
import { validateWorkerProfileUpdate } from "@/lib/auth/validation";
import type { WorkerProfileUiDefaults } from "@/mock/worker/profile";

type WorkerProfilePageProps = {
  initialProfile: UserProfile;
  uiDefaults: WorkerProfileUiDefaults;
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

function parseProfileForm(form: HTMLFormElement): UpdateWorkerProfilePayload {
  const data = new FormData(form);
  return {
    complete_name: String(data.get("complete_name") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    phone: String(data.get("phone") ?? "").trim(),
    postal_code: String(data.get("postal_code") ?? "").trim(),
    biography: String(data.get("biography") ?? "").trim(),
  };
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
  uiDefaults,
}: WorkerProfilePageProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [biography, setBiography] = useState<string>(uiDefaults.biography);
  const [isEditing, setIsEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = parseProfileForm(event.currentTarget);
      const validation = validateWorkerProfileUpdate(payload);

      if (!validation.ok) {
        setFieldErrors(validation.errors);
        throw Object.assign(new Error("validation"), {
          fieldErrors: validation.errors,
        });
      }

      const result = await updateWorkerProfileAction(payload);
      setProfile(result.user);
      setBiography(payload.biography ?? biography);
      setFormKey((current) => current + 1);
      setIsEditing(false);

      if (result.emailChanged) {
        toast.success(result.message, {
          description:
            "Verifique a caixa de entrada do novo e-mail para confirmar a alteração.",
        });
      } else {
        toast.success(result.message);
      }

      router.refresh();
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "validation" &&
        "fieldErrors" in err
      ) {
        return;
      }

      const mapped = mapApiErrorToFieldErrors(err);
      if (mapped) {
        setFieldErrors(mapped);
      }

      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteWorkerAccountAction();
      toast.success("Conta excluída com sucesso.");
      router.push("/select-user");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const readOnly = !isEditing;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="size-16 border border-border/80">
            <AvatarFallback className="bg-secondary/10 text-lg font-semibold text-secondary">
              {getInitials(profile.complete_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {profile.complete_name}
              </h1>
              <Badge
                variant="outline"
                className="border-secondary/40 text-secondary"
              >
                Profissional
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {uiDefaults.rating}
              </span>
              <span>({uiDefaults.reviewCount} avaliações)</span>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant={isEditing ? "outline" : "default"}
          className={
            isEditing
              ? undefined
              : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
          }
          onClick={() => {
            setFieldErrors({});
            if (isEditing) {
              setFormKey((current) => current + 1);
            }
            setIsEditing((current) => !current);
          }}
        >
          {isEditing ? "Cancelar edição" : "Editar perfil"}
        </Button>
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
                Dados profissionais
              </CardTitle>
              <CardDescription>
                Gerencie suas informações pessoais e profissionais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                key={`profile-form-${formKey}-${profile.id}`}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="complete_name">Nome completo</FieldLabel>
                    <Input
                      id="complete_name"
                      name="complete_name"
                      defaultValue={profile.complete_name}
                      readOnly={readOnly}
                      aria-invalid={!!fieldErrors.complete_name}
                      className={readOnly ? "bg-muted/40" : undefined}
                    />
                    <FieldError message={fieldErrors.complete_name} />
                  </Field>

                  <Field className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <FieldLabel htmlFor="email">E-mail</FieldLabel>
                      {!profile.email_verified && (
                        <Badge variant="outline" className="text-amber-700">
                          E-mail não verificado
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={profile.email}
                        readOnly={readOnly}
                        autoComplete="email"
                        aria-invalid={!!fieldErrors.email}
                        className={`pl-9 ${readOnly ? "bg-muted/40" : ""}`}
                      />
                    </div>
                    <FieldError message={fieldErrors.email} />
                    {isEditing && (
                      <Alert className="mt-2">
                        <Info className="size-4" />
                        <AlertDescription>
                          Ao alterar o e-mail, enviaremos um link de confirmação
                          para o novo endereço.
                        </AlertDescription>
                      </Alert>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={profile.phone}
                        readOnly={readOnly}
                        autoComplete="tel"
                        aria-invalid={!!fieldErrors.phone}
                        className={`pl-9 ${readOnly ? "bg-muted/40" : ""}`}
                      />
                    </div>
                    <FieldError message={fieldErrors.phone} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="postal_code">CEP</FieldLabel>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="postal_code"
                        name="postal_code"
                        defaultValue={profile.postal_code}
                        readOnly={readOnly}
                        autoComplete="postal-code"
                        aria-invalid={!!fieldErrors.postal_code}
                        className={`pl-9 ${readOnly ? "bg-muted/40" : ""}`}
                      />
                    </div>
                    <FieldError message={fieldErrors.postal_code} />
                  </Field>

                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="biography">Biografia</FieldLabel>
                    <Textarea
                      id="biography"
                      name="biography"
                      defaultValue={biography}
                      readOnly={readOnly}
                      rows={4}
                      className={readOnly ? "bg-muted/40" : undefined}
                    />
                  </Field>
                </FieldGroup>

                {isEditing && (
                  <div className="flex justify-end">
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
                      ) : (
                        "Salvar alterações"
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

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
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? (
                        <>
                          <Spinner className="mr-2" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 size-4" />
                          Excluir conta
                        </>
                      )}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todos os seus dados serão
                      removidos da plataforma. Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDeleteAccount}
                    >
                      Sim, excluir conta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio">
          <TabPlaceholder
            icon={Briefcase}
            title="Portfólio em breve"
            description="Em breve você poderá exibir fotos e descrições dos seus trabalhos realizados."
          />
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
