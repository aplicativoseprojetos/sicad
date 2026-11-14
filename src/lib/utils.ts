import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata CPF: 000.000.000-00 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Formata RG: 00.000.000-0 */
export function formatRG(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
}

/** Formata CEP: 00000-000 */
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Valida CPF (algoritmicamente) */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[10])) return false;

  return true;
}

/** Formata data para exibição em pt-BR */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Lista de estados brasileiros */
export const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
] as const;

/** Artigos criminais comuns para tags */
export const ARTIGOS_COMUNS = [
  'Art. 121 - Homicídio',
  'Art. 129 - Lesão Corporal',
  'Art. 155 - Furto',
  'Art. 157 - Roubo',
  'Art. 158 - Extorsão',
  'Art. 159 - Extorsão mediante sequestro',
  'Art. 171 - Estelionato',
  'Art. 180 - Receptação',
  'Art. 213 - Estupro',
  'Art. 217-A - Estupro de vulnerável',
  'Art. 250 - Incêndio',
  'Art. 288 - Associação Criminosa',
  'Art. 33 (Lei 11.343) - Tráfico de Drogas',
  'Art. 35 (Lei 11.343) - Associação para o Tráfico',
  'Art. 14 (Lei 10.826) - Porte ilegal de arma',
  'Art. 16 (Lei 10.826) - Posse/porte de arma de uso restrito',
  'Art. 2º (Lei 12.850) - Organização Criminosa',
] as const;

/** Opções de compleição física */
export const COMPLEICOES = [
  'Magra', 'Normal', 'Atlética', 'Forte', 'Obesa',
] as const;

/** Opções de cor de olhos */
export const CORES_OLHOS = [
  'Castanho escuro', 'Castanho claro', 'Verde', 'Azul', 'Mel', 'Cinza', 'Preto',
] as const;

/** Opções de cor de cabelo */
export const CORES_CABELO = [
  'Preto', 'Castanho escuro', 'Castanho claro', 'Loiro', 'Ruivo', 'Grisalho', 'Branco', 'Careca/Raspado',
] as const;
