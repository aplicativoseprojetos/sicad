'use client';

import { useState, useCallback, useRef, useEffect, Suspense, type ChangeEvent, type DragEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import {
  Upload, X, Plus, ChevronLeft, ChevronRight, Save, Camera, User, MapPin, FileText, Eye, Loader2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';
import {
  formatCPF, formatRG, formatCEP, ESTADOS_BR, ARTIGOS_COMUNS,
  COMPLEICOES, CORES_OLHOS, CORES_CABELO, cn,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FotoLabel = 'frente' | 'perfil_direito' | 'perfil_esquerdo' | 'tatuagem' | 'marca';

interface FotoEntry {
  id: string;
  file: File;
  preview: string;
  label: FotoLabel;
}

interface FormData {
  // Tab 1 – Dados Pessoais
  nome_completo: string;
  vulgo: string;
  matricula_registro: string;
  rg: string;
  cpf: string;
  // Tab 2 – Endereço
  cep: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_estado: string;
  endereco_complemento: string;
  // Tab 3 – Dados Criminais
  artigos_criminais: string[];
  modus_operandi: string;
  // Tab 4 – Características Físicas
  altura: string;
  peso: string;
  compleicao_fisica: string;
  cor_olhos: string;
  cor_cabelo: string;
  sinais_caracteristicos: string;
}

const INITIAL_FORM: FormData = {
  nome_completo: '',
  vulgo: '',
  matricula_registro: '',
  rg: '',
  cpf: '',
  cep: '',
  endereco_rua: '',
  endereco_numero: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_complemento: '',
  artigos_criminais: [],
  modus_operandi: '',
  altura: '',
  peso: '',
  compleicao_fisica: '',
  cor_olhos: '',
  cor_cabelo: '',
  sinais_caracteristicos: '',
};

const TABS = [
  { label: 'Dados Pessoais', icon: User },
  { label: 'Endereço', icon: MapPin },
  { label: 'Dados Criminais', icon: FileText },
  { label: 'Características', icon: Eye },
  { label: 'Fotos', icon: Camera },
] as const;

const FOTO_LABELS: { value: FotoLabel; label: string }[] = [
  { value: 'frente', label: 'Frente' },
  { value: 'perfil_direito', label: 'Perfil Direito' },
  { value: 'perfil_esquerdo', label: 'Perfil Esquerdo' },
  { value: 'tatuagem', label: 'Tatuagem' },
  { value: 'marca', label: 'Marca' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripMask(value: string): string {
  return value.replace(/\D/g, '');
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    }>
      <CadastroPageContent />
    </Suspense>
  );
}

function CadastroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const supabase = createClient();
  const [currentTab, setCurrentTab] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [fotos, setFotos] = useState<FotoEntry[]>([]);
  const [customArtigo, setCustomArtigo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Load existing data for edit mode ----
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('individuos')
        .select('*')
        .eq('id', editId)
        .single();

      if (fetchError || !data) {
        setLoadingEdit(false);
        return;
      }

      setForm({
        nome_completo: data.nome_completo || '',
        vulgo: data.vulgo || '',
        matricula_registro: data.matricula_registro || '',
        rg: data.rg ? formatRG(data.rg) : '',
        cpf: data.cpf ? formatCPF(data.cpf) : '',
        cep: data.cep ? formatCEP(data.cep) : '',
        endereco_rua: data.endereco_rua || '',
        endereco_numero: data.endereco_numero || '',
        endereco_bairro: data.endereco_bairro || '',
        endereco_cidade: data.endereco_cidade || '',
        endereco_estado: data.endereco_estado || '',
        endereco_complemento: data.endereco_complemento || '',
        artigos_criminais: data.artigos_criminais || [],
        modus_operandi: data.modus_operandi || '',
        altura: data.altura ? String(data.altura) : '',
        peso: data.peso ? String(data.peso) : '',
        compleicao_fisica: data.compleicao_fisica || '',
        cor_olhos: data.cor_olhos || '',
        cor_cabelo: data.cor_cabelo || '',
        sinais_caracteristicos: data.sinais_caracteristicos || '',
      });

      setLoadingEdit(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ---- Toast helper ----
  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ---- Generic field setter ----
  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ---- Masked field handlers ----
  const handleCPF = (e: ChangeEvent<HTMLInputElement>) => setField('cpf', formatCPF(e.target.value));
  const handleRG = (e: ChangeEvent<HTMLInputElement>) => setField('rg', formatRG(e.target.value));
  const handleCEP = (e: ChangeEvent<HTMLInputElement>) => setField('cep', formatCEP(e.target.value));

  // ---- Artigos Criminais helpers ----
  const toggleArtigo = (artigo: string) => {
    setForm((prev) => {
      const exists = prev.artigos_criminais.includes(artigo);
      return {
        ...prev,
        artigos_criminais: exists
          ? prev.artigos_criminais.filter((a) => a !== artigo)
          : [...prev.artigos_criminais, artigo],
      };
    });
  };

  const addCustomArtigo = () => {
    const trimmed = customArtigo.trim();
    if (!trimmed) return;
    if (!form.artigos_criminais.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        artigos_criminais: [...prev.artigos_criminais, trimmed],
      }));
    }
    setCustomArtigo('');
  };

  const removeArtigo = (artigo: string) => {
    setForm((prev) => ({
      ...prev,
      artigos_criminais: prev.artigos_criminais.filter((a) => a !== artigo),
    }));
  };

  // ---- Photo helpers ----
  const addPhotos = async (files: FileList | File[]) => {
    const remaining = 5 - fotos.length;
    if (remaining <= 0) {
      showToast('Máximo de 5 fotos permitidas.');
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    const newEntries: FotoEntry[] = [];

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
        const preview = URL.createObjectURL(compressed);
        newEntries.push({
          id: generateId(),
          file: compressed,
          preview,
          label: 'frente',
        });
      } catch {
        showToast(`Erro ao processar imagem: ${file.name}`);
      }
    }

    setFotos((prev) => [...prev, ...newEntries]);
  };

  const removePhoto = (id: string) => {
    setFotos((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updatePhotoLabel = (id: string, label: FotoLabel) => {
    setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, label } : f)));
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addPhotos(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addPhotos(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  // ---- Validation ----
  const validateTab = (tab: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (tab === 0) {
      if (!form.nome_completo.trim()) newErrors.nome_completo = 'Nome completo é obrigatório.';
    }

    // Other tabs have no required fields – but we can extend here as needed.
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Navigation ----
  const goNext = () => {
    if (!validateTab(currentTab)) return;
    setCurrentTab((prev) => Math.min(prev + 1, TABS.length - 1));
  };

  const goPrev = () => setCurrentTab((prev) => Math.max(prev - 1, 0));

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!validateTab(currentTab)) return;
    setSubmitting(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('Usuário não autenticado.');

      const userId = userData.user.id;

      // Build the row
      const row: Record<string, unknown> = {
        nome_completo: form.nome_completo.trim(),
        vulgo: form.vulgo.trim() || null,
        matricula_registro: form.matricula_registro.trim() || null,
        rg: stripMask(form.rg) || null,
        cpf: stripMask(form.cpf) || null,
        cep: stripMask(form.cep) || null,
        endereco_rua: form.endereco_rua.trim() || null,
        endereco_numero: form.endereco_numero.trim() || null,
        endereco_bairro: form.endereco_bairro.trim() || null,
        endereco_cidade: form.endereco_cidade.trim() || null,
        endereco_estado: form.endereco_estado || null,
        endereco_complemento: form.endereco_complemento.trim() || null,
        artigos_criminais: form.artigos_criminais,
        modus_operandi: form.modus_operandi.trim() || null,
        altura: form.altura ? parseFloat(form.altura) : null,
        peso: form.peso ? parseFloat(form.peso) : null,
        compleicao_fisica: form.compleicao_fisica || null,
        cor_olhos: form.cor_olhos || null,
        cor_cabelo: form.cor_cabelo || null,
        sinais_caracteristicos: form.sinais_caracteristicos.trim() || null,
      };

      let individuoId: string;

      if (editId) {
        // ---- UPDATE existing ----
        const { error: updateError } = await supabase
          .from('individuos')
          .update(row)
          .eq('id', editId);

        if (updateError) throw new Error(updateError.message ?? 'Erro ao atualizar cadastro.');
        individuoId = editId;
      } else {
        // ---- INSERT new ----
        row.criado_por = userId;
        const { data: individuo, error: insertError } = await supabase
          .from('individuos')
          .insert(row)
          .select('id')
          .single();

        if (insertError || !individuo) throw new Error(insertError?.message ?? 'Erro ao salvar cadastro.');
        individuoId = individuo.id;
      }

      // Upload new photos
      for (const foto of fotos) {
        const ext = foto.file.name.split('.').pop() ?? 'jpg';
        const storagePath = `${individuoId}/${generateId()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos')
          .upload(storagePath, foto.file, { contentType: foto.file.type });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        await supabase.from('fotos').insert({
          individuo_id: individuoId,
          storage_path: storagePath,
          descricao: foto.label,
          ordem: 0,
        });
      }

      showToast(editId ? 'Cadastro atualizado com sucesso!' : 'Cadastro salvo com sucesso!', 'success');
      router.push(`/individuo/${individuoId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao salvar.';
      showToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Shared input classes ----
  const inputClass = cn(
    'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm',
    'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
    'dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 transition-colors',
  );

  const selectClass = cn(inputClass, 'appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat',
    'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E")]',
  );

  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  const errorMsgClass = 'mt-1 text-xs text-red-500 dark:text-red-400';

  // ---- Render helpers ----
  const renderInput = (
    key: keyof FormData,
    label: string,
    opts?: {
      placeholder?: string;
      type?: string;
      step?: string;
      onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
      required?: boolean;
    },
  ) => (
    <div>
      <label htmlFor={key} className={labelClass}>
        {label}
        {opts?.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={key}
        type={opts?.type ?? 'text'}
        step={opts?.step}
        value={form[key] as string}
        onChange={opts?.onChange ?? ((e) => setField(key, e.target.value))}
        placeholder={opts?.placeholder}
        className={cn(inputClass, errors[key] && 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500/20')}
      />
      {errors[key] && <p className={errorMsgClass}>{errors[key]}</p>}
    </div>
  );

  const renderSelect = (
    key: keyof FormData,
    label: string,
    options: readonly string[],
    placeholder: string,
  ) => (
    <div>
      <label htmlFor={key} className={labelClass}>{label}</label>
      <select
        id={key}
        value={form[key] as string}
        onChange={(e) => setField(key, e.target.value)}
        className={selectClass}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  const renderTextarea = (key: keyof FormData, label: string, rows: number, placeholder?: string) => (
    <div>
      <label htmlFor={key} className={labelClass}>{label}</label>
      <textarea
        id={key}
        rows={rows}
        value={form[key] as string}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, 'resize-none')}
      />
    </div>
  );

  // ====== TAB CONTENT ======

  const tabContent = [
    // ---- Tab 0: Dados Pessoais ----
    <div key="tab0" className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        {renderInput('nome_completo', 'Nome Completo', { placeholder: 'Nome completo do indivíduo', required: true })}
      </div>
      {renderInput('vulgo', 'Vulgo / Alcunha', { placeholder: 'Apelido ou vulgo' })}
      {renderInput('matricula_registro', 'Matrícula / Registro', { placeholder: 'Nº de matrícula ou registro' })}
      {renderInput('rg', 'RG', { placeholder: '00.000.000-0', onChange: handleRG })}
      {renderInput('cpf', 'CPF', { placeholder: '000.000.000-00', onChange: handleCPF })}
    </div>,

    // ---- Tab 1: Endereço ----
    <div key="tab1" className="grid gap-5 sm:grid-cols-2">
      <div>
        {renderInput('cep', 'CEP', { placeholder: '00000-000', onChange: handleCEP })}
      </div>
      <div className="sm:col-span-2">
        {renderInput('endereco_rua', 'Rua / Logradouro', { placeholder: 'Nome da rua' })}
      </div>
      {renderInput('endereco_numero', 'Número', { placeholder: 'Nº' })}
      {renderInput('endereco_complemento', 'Complemento', { placeholder: 'Apto, bloco, etc.' })}
      {renderInput('endereco_bairro', 'Bairro', { placeholder: 'Bairro' })}
      {renderInput('endereco_cidade', 'Cidade', { placeholder: 'Cidade' })}
      {renderSelect('endereco_estado', 'Estado', ESTADOS_BR, 'Selecione o estado')}
    </div>,

    // ---- Tab 2: Dados Criminais ----
    <div key="tab2" className="space-y-6">
      {/* Artigos Criminais */}
      <div>
        <label className={labelClass}>Artigos Criminais</label>

        {/* Selected chips */}
        {form.artigos_criminais.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {form.artigos_criminais.map((artigo) => (
              <span
                key={artigo}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800',
                  'dark:bg-indigo-900/40 dark:text-indigo-300',
                )}
              >
                {artigo}
                <button
                  type="button"
                  onClick={() => removeArtigo(artigo)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  aria-label={`Remover ${artigo}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Common articles as clickable chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          {ARTIGOS_COMUNS.map((artigo) => {
            const selected = form.artigos_criminais.includes(artigo);
            return (
              <button
                key={artigo}
                type="button"
                onClick={() => toggleArtigo(artigo)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  selected
                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-500'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700',
                )}
              >
                {artigo}
              </button>
            );
          })}
        </div>

        {/* Custom artigo input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customArtigo}
            onChange={(e) => setCustomArtigo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomArtigo();
              }
            }}
            placeholder="Adicionar artigo personalizado..."
            className={cn(inputClass, 'flex-1')}
          />
          <button
            type="button"
            onClick={addCustomArtigo}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm',
              'hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors',
              'dark:bg-indigo-500 dark:hover:bg-indigo-600',
            )}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {renderTextarea('modus_operandi', 'Modus Operandi', 4, 'Descreva o modus operandi...')}
    </div>,

    // ---- Tab 3: Características Físicas ----
    <div key="tab3" className="grid gap-5 sm:grid-cols-2">
      {renderInput('altura', 'Altura (m)', { placeholder: '1.75', type: 'number', step: '0.01' })}
      {renderInput('peso', 'Peso (kg)', { placeholder: '80.5', type: 'number', step: '0.1' })}
      {renderSelect('compleicao_fisica', 'Compleição Física', COMPLEICOES, 'Selecione')}
      {renderSelect('cor_olhos', 'Cor dos Olhos', CORES_OLHOS, 'Selecione')}
      {renderSelect('cor_cabelo', 'Cor do Cabelo', CORES_CABELO, 'Selecione')}
      <div className="sm:col-span-2">
        {renderTextarea('sinais_caracteristicos', 'Sinais Característicos', 4, 'Tatuagens, cicatrizes, marcas de nascença...')}
      </div>
    </div>,

    // ---- Tab 4: Fotos ----
    <div key="tab4" className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
          dragOver
            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-indigo-500 dark:hover:bg-slate-800',
          fotos.length >= 5 && 'pointer-events-none opacity-50',
        )}
      >
        <Upload className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Arraste fotos aqui ou clique para selecionar
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Máximo 5 fotos • JPG, PNG • Compressão automática
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Preview grid */}
      {fotos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className={cn(
                'relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
                'dark:border-slate-700 dark:bg-slate-800',
              )}
            >
              {/* Image preview */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.preview}
                  alt={`Foto ${foto.label}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(foto.id)}
                  className={cn(
                    'absolute right-2 top-2 rounded-full bg-red-500/90 p-1.5 text-white shadow-md',
                    'hover:bg-red-600 focus:outline-none transition-colors',
                  )}
                  aria-label="Remover foto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Label selector */}
              <div className="p-3">
                <select
                  value={foto.label}
                  onChange={(e) => updatePhotoLabel(foto.id, e.target.value as FotoLabel)}
                  className={cn(selectClass, 'text-xs')}
                >
                  {FOTO_LABELS.map((fl) => (
                    <option key={fl.value} value={fl.value}>{fl.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        {fotos.length}/5 fotos adicionadas
      </p>
    </div>,
  ];

  // ====== RENDER ======

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {editId ? 'Editar Cadastro' : 'Novo Cadastro'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {editId
              ? 'Atualize as informações do indivíduo cadastrado.'
              : 'Preencha as informações para registrar um novo indivíduo no sistema.'}
          </p>
        </div>

        {/* Tab indicators */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === currentTab;
              const isCompleted = index < currentTab;

              return (
                <li key={tab.label} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      // allow going back freely; forward requires validation
                      if (index < currentTab) {
                        setCurrentTab(index);
                      } else if (index === currentTab + 1) {
                        goNext();
                      }
                    }}
                    className={cn(
                      'flex w-full flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all',
                      isActive && 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-400',
                      isCompleted && 'bg-green-50 dark:bg-green-950/30',
                      !isActive && !isCompleted && 'bg-white dark:bg-slate-800',
                      'border border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isActive && 'text-indigo-600 dark:text-indigo-400',
                        isCompleted && 'text-green-600 dark:text-green-400',
                        !isActive && !isCompleted && 'text-slate-400 dark:text-slate-500',
                      )}
                    />
                    <span
                      className={cn(
                        'hidden text-xs font-medium sm:block',
                        isActive && 'text-indigo-700 dark:text-indigo-300',
                        isCompleted && 'text-green-700 dark:text-green-300',
                        !isActive && !isCompleted && 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {tab.label}
                    </span>
                  </button>

                  {/* Connector line */}
                  {index < TABS.length - 1 && (
                    <div
                      className={cn(
                        'mx-1 hidden h-0.5 w-4 flex-shrink-0 sm:block',
                        isCompleted ? 'bg-green-400 dark:bg-green-500' : 'bg-slate-200 dark:bg-slate-700',
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Form card */}
        <div
          className={cn(
            'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8',
            'dark:border-slate-700 dark:bg-slate-900',
          )}
        >
          {/* Tab title */}
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {(() => {
              const Icon = TABS[currentTab].icon;
              return <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
            })()}
            {TABS[currentTab].label}
          </h2>

          {/* Tab body */}
          <div className="min-h-[280px]">
            {tabContent[currentTab]}
          </div>

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentTab === 0}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm',
                'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors',
                'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            {currentTab < TABS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm',
                  'hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors',
                  'dark:bg-indigo-500 dark:hover:bg-indigo-600',
                )}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm',
                  'hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-colors',
                  'dark:bg-green-500 dark:hover:bg-green-600',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editId ? 'Atualizar Cadastro' : 'Salvar Cadastro'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg transition-all',
            toast.type === 'error'
              ? 'bg-red-600 text-white dark:bg-red-500'
              : 'bg-green-600 text-white dark:bg-green-500',
          )}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-0.5 hover:bg-white/20 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
