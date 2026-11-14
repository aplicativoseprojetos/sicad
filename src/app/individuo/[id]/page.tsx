'use client';

import { useEffect, useState, useCallback, useRef, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  User,
  MapPin,
  FileText,
  Eye,
  Camera,
  Clock,
  MessageSquare,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Ruler,
  Weight,
  Send,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Individuo, Foto, Observacao, Profile } from '@/types/database';
import { cn, formatCPF, formatRG, formatCEP, formatDate } from '@/lib/utils';

/* ───────────────── Extended types for joined data ───────────────── */

type ObservacaoComAutor = Observacao & {
  profiles?: { nome: string | null; email: string } | null;
};

type IndividuoCompleto = Individuo & {
  fotos?: Foto[];
  observacoes?: ObservacaoComAutor[];
  autor?: { nome: string | null; email: string } | null;
};

/* ───────────────── Lightbox Component ───────────────── */

function Lightbox({
  fotos,
  fotoUrls,
  initialIndex,
  onClose,
}: {
  fotos: Foto[];
  fotoUrls: Map<string, string>;
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const foto = fotos[currentIndex];
  const url = fotoUrls.get(foto.storage_path) || '';

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : fotos.length - 1));
        setScale(1);
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < fotos.length - 1 ? prev + 1 : 0));
        setScale(1);
      }
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fotos.length, onClose]);

  function handlePrev() {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : fotos.length - 1));
    setScale(1);
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev < fotos.length - 1 ? prev + 1 : 0));
    setScale(1);
  }

  function handleZoomIn() {
    setScale((prev) => Math.min(prev + 0.5, 4));
  }

  function handleZoomOut() {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Controls bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="min-w-[3rem] text-center text-sm text-white/80">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="ml-2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Photo counter */}
      <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
        {currentIndex + 1} / {fotos.length}
      </div>

      {/* Navigation arrows */}
      {fotos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div className="flex h-full w-full items-center justify-center overflow-auto p-12">
        <div
          className="transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={foto.descricao || `Foto ${currentIndex + 1}`}
            className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            draggable={false}
          />
        </div>
      </div>

      {/* Caption */}
      {foto.descricao && (
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white/90">
          {foto.descricao}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Delete Confirmation Dialog ───────────────── */

function DeleteDialog({
  nome,
  onConfirm,
  onCancel,
  loading,
}: {
  nome: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir o registro de{' '}
          <strong className="text-slate-900 dark:text-white">{nome}</strong>?
          Todas as fotos e observações associadas serão removidas permanentemente.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Info Field Helper ───────────────── */

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {value || '—'}
      </dd>
    </div>
  );
}

/* ───────────────── Section Card Helper ───────────────── */

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800',
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-700">
        <Icon className="h-5 w-5 text-indigo-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function IndividuoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  /* ── State ── */
  const [individuo, setIndividuo] = useState<IndividuoCompleto | null>(null);
  const [fotoUrls, setFotoUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [novaObservacao, setNovaObservacao] = useState('');
  const [submittingObs, setSubmittingObs] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);

  /* ── Fetch individual data ── */
  const fetchIndividuo = useCallback(async () => {
    if (!params.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('individuos')
      .select(
        `
        *,
        fotos (*),
        observacoes (*, profiles:autor_id (nome, email)),
        autor:criado_por (nome, email)
      `
      )
      .eq('id', params.id)
      .single();

    if (fetchError) {
      setError('Erro ao carregar dados do indivíduo.');
      setLoading(false);
      return;
    }

    const individuoData = data as unknown as IndividuoCompleto;

    // Sort fotos by ordem
    if (individuoData.fotos) {
      individuoData.fotos.sort((a, b) => a.ordem - b.ordem);
    }

    // Sort observacoes by criado_em ascending (chronological)
    if (individuoData.observacoes) {
      individuoData.observacoes.sort(
        (a, b) =>
          new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
      );
    }

    // Build photo URL map
    const urlMap = new Map<string, string>();
    if (individuoData.fotos) {
      for (const foto of individuoData.fotos) {
        const { data: urlData } = supabase.storage
          .from('fotos')
          .getPublicUrl(foto.storage_path);
        urlMap.set(foto.storage_path, urlData.publicUrl);
      }
    }

    setFotoUrls(urlMap);
    setIndividuo(individuoData);
    setLoading(false);
  }, [params.id, supabase]);

  /* ── Fetch current user profile ── */
  const fetchCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setCurrentUser(profile as Profile);
    }
  }, [supabase]);

  /* ── Initial data load ── */
  useEffect(() => {
    fetchIndividuo();
    fetchCurrentUser();
  }, [fetchIndividuo, fetchCurrentUser]);

  /* ── Check permissions when user & individuo are loaded ── */
  useEffect(() => {
    if (currentUser && individuo) {
      const isCreator = currentUser.id === individuo.criado_por;
      const isAdmin = currentUser.role === 'admin';
      setCanEdit(isCreator || isAdmin);
    }
  }, [currentUser, individuo]);

  /* ── Delete handler ── */
  async function handleDelete() {
    if (!individuo) return;
    setDeleting(true);

    // Delete photos from storage
    if (individuo.fotos && individuo.fotos.length > 0) {
      const paths = individuo.fotos.map((f) => f.storage_path);
      await supabase.storage.from('fotos').remove(paths);
    }

    // Delete individuo record (cascade handles fotos + observacoes rows)
    const { error: deleteError } = await supabase
      .from('individuos')
      .delete()
      .eq('id', individuo.id);

    setDeleting(false);

    if (deleteError) {
      setError('Erro ao excluir registro. Tente novamente.');
      setShowDeleteDialog(false);
      return;
    }

    router.push('/dashboard');
  }

  /* ── Add observation handler ── */
  async function handleAddObservacao(e: FormEvent) {
    e.preventDefault();
    if (!novaObservacao.trim() || !individuo || !currentUser) return;

    setSubmittingObs(true);

    const autorNome = currentUser.nome || currentUser.email;

    const { error: insertError } = await supabase.from('observacoes').insert({
      individuo_id: individuo.id,
      autor_id: currentUser.id,
      autor_nome: autorNome,
      texto: novaObservacao.trim(),
    });

    setSubmittingObs(false);

    if (insertError) {
      setError('Erro ao adicionar observação.');
      return;
    }

    setNovaObservacao('');
    await fetchIndividuo();
  }

  /* ── Gallery scroll helpers ── */
  function scrollGallery(direction: 'left' | 'right') {
    if (!galleryRef.current) return;
    const scrollAmount = 280;
    galleryRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }

  /* ── Build formatted address ── */
  function buildAddress(ind: IndividuoCompleto): string | null {
    const parts: string[] = [];

    if (ind.endereco_rua) {
      let line = ind.endereco_rua;
      if (ind.endereco_numero) line += `, ${ind.endereco_numero}`;
      if (ind.endereco_complemento) line += ` - ${ind.endereco_complemento}`;
      parts.push(line);
    }

    if (ind.endereco_bairro) parts.push(ind.endereco_bairro);

    if (ind.endereco_cidade || ind.endereco_estado) {
      const cityState = [ind.endereco_cidade, ind.endereco_estado]
        .filter(Boolean)
        .join(' - ');
      parts.push(cityState);
    }

    if (ind.cep) parts.push(`CEP: ${formatCEP(ind.cep)}`);

    return parts.length > 0 ? parts.join('\n') : null;
  }

  /* ═══════════════ RENDER ═══════════════ */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Carregando dossiê...
          </p>
        </div>
      </div>
    );
  }

  if (error && !individuo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="mx-4 max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
            Erro
          </h2>
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!individuo) return null;

  const fotos = individuo.fotos || [];
  const observacoes = (individuo.observacoes || []) as ObservacaoComAutor[];
  const address = buildAddress(individuo);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* ── LIGHTBOX ── */}
      {lightboxIndex !== null && fotos.length > 0 && (
        <Lightbox
          fotos={fotos}
          fotoUrls={fotoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ── DELETE DIALOG ── */}
      {showDeleteDialog && (
        <DeleteDialog
          nome={individuo.nome_completo}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          loading={deleting}
        />
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="hidden h-6 w-px bg-slate-300 dark:bg-slate-600 sm:block" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {individuo.nome_completo}
                {individuo.vulgo && (
                  <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
                    ({individuo.vulgo})
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastrado em {formatDate(individuo.criado_em)}
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/cadastro?id=${individuo.id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MOBILE TITLE ── */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:hidden">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {individuo.nome_completo}
          {individuo.vulgo && (
            <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
              ({individuo.vulgo})
            </span>
          )}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cadastrado em {formatDate(individuo.criado_em)}
        </p>
      </div>

      {/* ── BODY ── */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Transient error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ═══════ PHOTO GALLERY ═══════ */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Fotos
            </h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              {fotos.length}
            </span>
          </div>

          {fotos.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
              <div className="text-center">
                <User className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma foto cadastrada
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Scroll buttons */}
              {fotos.length > 3 && (
                <>
                  <button
                    onClick={() => scrollGallery('left')}
                    className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-md transition hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-700"
                    aria-label="Scroll esquerda"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </button>
                  <button
                    onClick={() => scrollGallery('right')}
                    className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-md transition hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-700"
                    aria-label="Scroll direita"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </button>
                </>
              )}

              {/* Gallery strip */}
              <div
                ref={galleryRef}
                className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
              >
                {fotos.map((foto, index) => {
                  const url = fotoUrls.get(foto.storage_path) || '';
                  return (
                    <button
                      key={foto.id}
                      onClick={() => setLightboxIndex(index)}
                      className="group relative flex-shrink-0 overflow-hidden rounded-xl border-2 border-transparent transition focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-400"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={foto.descricao || `Foto ${index + 1}`}
                        className="h-48 w-40 object-cover transition group-hover:scale-105 sm:h-56 sm:w-48"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 transition group-hover:opacity-100" />
                      </div>
                      {foto.descricao && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
                          <p className="truncate text-xs text-white">
                            {foto.descricao}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ═══════ INFO GRID ═══════ */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Identificação ── */}
          <SectionCard title="Identificação" icon={User}>
            <dl className="grid grid-cols-2 gap-4">
              <InfoField
                label="Nome Completo"
                value={individuo.nome_completo}
                className="col-span-2"
              />
              <InfoField label="Vulgo / Alcunha" value={individuo.vulgo} />
              <InfoField
                label="Matrícula / Registro"
                value={individuo.matricula_registro}
              />
              <InfoField
                label="RG"
                value={individuo.rg ? formatRG(individuo.rg) : null}
              />
              <InfoField
                label="CPF"
                value={individuo.cpf ? formatCPF(individuo.cpf) : null}
              />
            </dl>
          </SectionCard>

          {/* ── Endereço ── */}
          <SectionCard title="Endereço" icon={MapPin}>
            {address ? (
              <div className="space-y-1">
                {address.split('\n').map((line, i) => (
                  <p
                    key={i}
                    className="text-sm text-slate-700 dark:text-slate-300"
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400 dark:text-slate-500">
                Nenhum endereço registrado
              </p>
            )}
          </SectionCard>

          {/* ── Dados Criminais ── */}
          <SectionCard title="Dados Criminais" icon={Shield}>
            <div className="space-y-4">
              <div>
                <dt className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Artigos Criminais
                </dt>
                {individuo.artigos_criminais &&
                individuo.artigos_criminais.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {individuo.artigos_criminais.map((artigo, i) => (
                      <span
                        key={i}
                        className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      >
                        {artigo}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">
                    Nenhum artigo registrado
                  </p>
                )}
              </div>

              <div>
                <dt className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Modus Operandi
                </dt>
                {individuo.modus_operandi ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                    {individuo.modus_operandi}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">
                    Não informado
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── Características Físicas ── */}
          <SectionCard title="Características Físicas" icon={Eye}>
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <InfoField
                  label="Altura"
                  value={
                    individuo.altura
                      ? `${individuo.altura.toFixed(2)} m`
                      : null
                  }
                />
                <InfoField
                  label="Peso"
                  value={
                    individuo.peso ? `${individuo.peso} kg` : null
                  }
                />
                <InfoField
                  label="Compleição"
                  value={individuo.compleicao_fisica}
                />
                <InfoField
                  label="Cor dos Olhos"
                  value={individuo.cor_olhos}
                />
                <InfoField
                  label="Cor do Cabelo"
                  value={individuo.cor_cabelo}
                />
              </dl>

              {/* Sinais Característicos - highlighted box */}
              <div>
                <dt className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sinais Característicos
                </dt>
                {individuo.sinais_caracteristicos ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-200">
                      {individuo.sinais_caracteristicos}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">
                    Nenhum sinal registrado
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ═══════ METADATA ═══════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">
                Cadastrado por:
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {individuo.autor?.nome || individuo.autor?.email || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">
                Cadastrado em:
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(individuo.criado_em)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">
                Atualizado em:
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(individuo.atualizado_em)}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════ OBSERVAÇÕES / TIMELINE ═══════ */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Informações Adicionais / Linha do Tempo
            </h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              {observacoes.length}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            {observacoes.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma observação registrada
                </p>
              </div>
            ) : (
              <div className="relative ml-4 border-l-2 border-indigo-200 pl-6 dark:border-indigo-800">
                {observacoes.map((obs) => {
                  const autorDisplay =
                    obs.profiles?.nome ||
                    obs.profiles?.email ||
                    obs.autor_nome ||
                    'Desconhecido';

                  return (
                    <div key={obs.id} className="relative mb-6 last:mb-0">
                      {/* Timeline dot */}
                      <div className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-indigo-400 bg-white dark:border-indigo-500 dark:bg-slate-800" />

                      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {autorDisplay}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDate(obs.criado_em)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                          {obs.texto}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add observation form */}
            {currentUser && (
              <form
                onSubmit={handleAddObservacao}
                className={cn(
                  'mt-6 border-t border-slate-100 pt-4 dark:border-slate-700',
                  observacoes.length === 0 && 'mt-0 border-t-0 pt-0'
                )}
              >
                <label
                  htmlFor="nova-observacao"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Observação
                </label>
                <textarea
                  id="nova-observacao"
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Escreva uma nova observação, informação ou ocorrência..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingObs || !novaObservacao.trim()}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingObs ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
