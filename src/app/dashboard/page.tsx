'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';

import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Individuo, Foto } from '@/types/database';

type IndividuoComFoto = Individuo & {
  fotos: Pick<Foto, 'id' | 'storage_path'>[] | null;
};

const PAGE_SIZE = 12;

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cidade: '',
    bairro: '',
    artigos: '',
    sinais: '',
  });

  // Data state
  const [individuos, setIndividuos] = useState<IndividuoComFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Debounce ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  // Build and execute query
  const fetchIndividuos = useCallback(
    async (pageNumber: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        let query = supabase
          .from('individuos')
          .select('*, fotos(id, storage_path)', { count: 'exact' })
          .order('criado_em', { ascending: false })
          .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);

        // Global search across multiple fields
        if (debouncedSearch.trim()) {
          const term = `%${debouncedSearch.trim()}%`;
          query = (query as any).or(
            `nome_completo.ilike.${term},vulgo.ilike.${term},cpf.ilike.${term}`
          );
        }

        // Advanced filters
        if (filters.cidade.trim()) {
          query = query.ilike('endereco_cidade', `%${filters.cidade.trim()}%`);
        }
        if (filters.bairro.trim()) {
          query = query.ilike('endereco_bairro', `%${filters.bairro.trim()}%`);
        }
        if (filters.artigos.trim()) {
          query = query.contains('artigos_criminais', [filters.artigos.trim()]);
        }
        if (filters.sinais.trim()) {
          query = query.ilike(
            'sinais_caracteristicos',
            `%${filters.sinais.trim()}%`
          );
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('Erro ao buscar indivíduos:', error);
          return;
        }

        const results = (data ?? []) as IndividuoComFoto[];

        if (append) {
          setIndividuos((prev) => [...prev, ...results]);
        } else {
          setIndividuos(results);
        }

        setTotalCount(count);
        setHasMore(results.length === PAGE_SIZE);
      } catch (err) {
        console.error('Erro inesperado:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [supabase, debouncedSearch, filters]
  );

  // Re-fetch when search or filters change (reset to page 0)
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchIndividuos(0, false);
  }, [fetchIndividuos]);

  // Load more handler
  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIndividuos(nextPage, true);
  }

  // Clear all filters
  function handleClearFilters() {
    setFilters({ cidade: '', bairro: '', artigos: '', sinais: '' });
    setSearchTerm('');
  }

  // Get the photo URL for the first photo of an individuo
  function getPhotoUrl(individuo: IndividuoComFoto): string | null {
    if (!individuo.fotos || individuo.fotos.length === 0) return null;
    const foto = individuo.fotos[0];
    if (!foto.storage_path) return null;
    return supabase.storage
      .from('fotos')
      .getPublicUrl(foto.storage_path).data.publicUrl;
  }

  // Parse artigos_criminais into badge list
  function parseArtigos(artigos: string[] | string | null): string[] {
    if (!artigos) return [];
    if (Array.isArray(artigos)) return artigos.filter(Boolean);
    return artigos
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }

  const hasActiveFilters =
    filters.cidade || filters.bairro || filters.artigos || filters.sinais;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Painel de Consulta
            </h1>
            {totalCount !== null && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {totalCount}{' '}
                {totalCount === 1
                  ? 'indivíduo cadastrado'
                  : 'indivíduos cadastrados'}
              </p>
            )}
          </div>
          <Link
            href="/cadastro"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5',
              'bg-indigo-600 text-white font-medium shadow-sm',
              'hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              'dark:focus:ring-offset-slate-950 transition-colors'
            )}
          >
            <Plus className="h-5 w-5" />
            Novo Cadastro
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, vulgo, CPF ou artigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4',
                'text-slate-900 placeholder:text-slate-400 shadow-sm',
                'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                'dark:placeholder:text-slate-500 dark:focus:border-indigo-500',
                'transition-colors text-base'
              )}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              hasActiveFilters && 'text-indigo-600 dark:text-indigo-400'
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros avançados
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                {
                  [
                    filters.cidade,
                    filters.bairro,
                    filters.artigos,
                    filters.sinais,
                  ].filter(Boolean).length
                }
              </span>
            )}
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="filter-cidade"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Cidade
                  </label>
                  <input
                    id="filter-cidade"
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={filters.cidade}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, cidade: e.target.value }))
                    }
                    className={cn(
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
                      'text-slate-900 placeholder:text-slate-400',
                      'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      'dark:placeholder:text-slate-500 dark:focus:border-indigo-500'
                    )}
                  />
                </div>

                <div>
                  <label
                    htmlFor="filter-bairro"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Bairro
                  </label>
                  <input
                    id="filter-bairro"
                    type="text"
                    placeholder="Ex: Centro"
                    value={filters.bairro}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, bairro: e.target.value }))
                    }
                    className={cn(
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
                      'text-slate-900 placeholder:text-slate-400',
                      'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      'dark:placeholder:text-slate-500 dark:focus:border-indigo-500'
                    )}
                  />
                </div>

                <div>
                  <label
                    htmlFor="filter-artigos"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Artigos Criminais
                  </label>
                  <input
                    id="filter-artigos"
                    type="text"
                    placeholder="Ex: Art. 157"
                    value={filters.artigos}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, artigos: e.target.value }))
                    }
                    className={cn(
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
                      'text-slate-900 placeholder:text-slate-400',
                      'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      'dark:placeholder:text-slate-500 dark:focus:border-indigo-500'
                    )}
                  />
                </div>

                <div>
                  <label
                    htmlFor="filter-sinais"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Sinais Característicos
                  </label>
                  <input
                    id="filter-sinais"
                    type="text"
                    placeholder="Ex: tatuagem"
                    value={filters.sinais}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, sinais: e.target.value }))
                    }
                    className={cn(
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
                      'text-slate-900 placeholder:text-slate-400',
                      'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      'dark:placeholder:text-slate-500 dark:focus:border-indigo-500'
                    )}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium',
                      'text-slate-600 hover:bg-slate-100',
                      'dark:text-slate-400 dark:hover:bg-slate-800',
                      'transition-colors'
                    )}
                  >
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && individuos.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Nenhum indivíduo encontrado
            </h3>
            <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
              {debouncedSearch || hasActiveFilters
                ? 'Tente ajustar os termos de busca ou os filtros aplicados.'
                : 'Comece cadastrando um novo indivíduo no sistema.'}
            </p>
            {!debouncedSearch && !hasActiveFilters && (
              <Link
                href="/cadastro"
                className={cn(
                  'mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5',
                  'bg-indigo-600 text-white font-medium shadow-sm',
                  'hover:bg-indigo-700 transition-colors'
                )}
              >
                <Plus className="h-5 w-5" />
                Novo Cadastro
              </Link>
            )}
          </div>
        )}

        {/* Results Grid */}
        {!loading && individuos.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {individuos.map((individuo) => {
                const photoUrl = getPhotoUrl(individuo);
                const artigos = parseArtigos(individuo.artigos_criminais);

                return (
                  <button
                    key={individuo.id}
                    type="button"
                    onClick={() => router.push(`/individuo/${individuo.id}`)}
                    className={cn(
                      'group cursor-pointer rounded-xl border border-slate-200 bg-white p-5',
                      'text-left shadow-sm transition-all',
                      'hover:border-indigo-300 hover:shadow-md hover:ring-1 hover:ring-indigo-200',
                      'dark:border-slate-700 dark:bg-slate-900',
                      'dark:hover:border-indigo-600 dark:hover:ring-indigo-800',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                      'dark:focus:ring-offset-slate-950'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar / Photo */}
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={individuo.nome_completo}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                          {individuo.nome_completo}
                        </h3>
                        {individuo.vulgo && (
                          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                            Vulgo:{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {individuo.vulgo}
                            </span>
                          </p>
                        )}
                        {individuo.endereco_cidade && (
                          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                            {individuo.endereco_cidade}
                            {individuo.endereco_estado
                              ? ` - ${individuo.endereco_estado}`
                              : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Artigos badges */}
                    {artigos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {artigos.slice(0, 3).map((artigo, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                              'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
                              'dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800'
                            )}
                          >
                            {artigo}
                          </span>
                        ))}
                        {artigos.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            +{artigos.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-2.5',
                    'text-sm font-medium text-slate-700 shadow-sm',
                    'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
                    'dark:hover:bg-slate-700 dark:focus:ring-offset-slate-950',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'transition-colors'
                  )}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    'Carregar mais'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
