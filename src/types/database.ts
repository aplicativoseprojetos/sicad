export type Profile = {
  id: string;
  email: string;
  nome: string | null;
  matricula: string | null;
  role: 'operador' | 'admin';
  created_at: string;
};

export type Individuo = {
  id: string;
  nome_completo: string;
  vulgo: string | null;
  matricula_registro: string | null;
  rg: string | null;
  cpf: string | null;
  cep: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  endereco_complemento: string | null;
  artigos_criminais: string[];
  modus_operandi: string | null;
  altura: number | null;
  peso: number | null;
  compleicao_fisica: string | null;
  cor_olhos: string | null;
  cor_cabelo: string | null;
  sinais_caracteristicos: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
  // Joined fields
  fotos?: Foto[];
  observacoes?: Observacao[];
  autor?: Profile;
};

export type Foto = {
  id: string;
  individuo_id: string;
  storage_path: string;
  descricao: string | null;
  ordem: number;
  criado_em: string;
};

export type Observacao = {
  id: string;
  individuo_id: string;
  autor_id: string;
  autor_nome: string;
  texto: string;
  criado_em: string;
};

export type IndividuoFormData = {
  nome_completo: string;
  vulgo?: string;
  matricula_registro?: string;
  rg?: string;
  cpf?: string;
  cep?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_complemento?: string;
  artigos_criminais?: string[];
  modus_operandi?: string;
  altura?: number;
  peso?: number;
  compleicao_fisica?: string;
  cor_olhos?: string;
  cor_cabelo?: string;
  sinais_caracteristicos?: string;
};
