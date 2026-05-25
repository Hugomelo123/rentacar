import type { Vehicle } from "@workspace/api-client-react";

const ROWS: Omit<Vehicle, "id" | "created_at">[] = [
  { marca_modelo: "Renault Clio", categoria: "Economico", foto_url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=250&fit=crop", preco_base_dia: 28, valor_caucao: 800, extra_franquia_zero: 12, status: "disponivel" },
  { marca_modelo: "Peugeot 208", categoria: "Economico", foto_url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=250&fit=crop", preco_base_dia: 26, valor_caucao: 750, extra_franquia_zero: 11, status: "disponivel" },
  { marca_modelo: "Fiat 500", categoria: "Economico", foto_url: "https://images.unsplash.com/photo-1553440569-bcc63903a94d?w=400&h=250&fit=crop", preco_base_dia: 24, valor_caucao: 700, extra_franquia_zero: 10, status: "disponivel" },
  { marca_modelo: "VW Golf", categoria: "Familiar", foto_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop", preco_base_dia: 42, valor_caucao: 1000, extra_franquia_zero: 15, status: "disponivel" },
  { marca_modelo: "Renault Megane", categoria: "Familiar", foto_url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop", preco_base_dia: 38, valor_caucao: 900, extra_franquia_zero: 14, status: "disponivel" },
  { marca_modelo: "Seat Leon ST", categoria: "Familiar", foto_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=250&fit=crop", preco_base_dia: 40, valor_caucao: 950, extra_franquia_zero: 14, status: "disponivel" },
  { marca_modelo: "Nissan Qashqai", categoria: "SUV", foto_url: "https://images.unsplash.com/photo-1519641471654-76ce5427a786?w=400&h=250&fit=crop", preco_base_dia: 55, valor_caucao: 1200, extra_franquia_zero: 18, status: "disponivel" },
  { marca_modelo: "Hyundai Tucson", categoria: "SUV", foto_url: "https://images.unsplash.com/photo-1517940311902-7224c54d0a0a?w=400&h=250&fit=crop", preco_base_dia: 52, valor_caucao: 1150, extra_franquia_zero: 17, status: "disponivel" },
  { marca_modelo: "Jeep Renegade", categoria: "SUV", foto_url: "https://images.unsplash.com/photo-1606016159991-4be54c99c894?w=400&h=250&fit=crop", preco_base_dia: 58, valor_caucao: 1300, extra_franquia_zero: 19, status: "disponivel" },
  { marca_modelo: "BMW Série 3", categoria: "Premium", foto_url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=250&fit=crop", preco_base_dia: 89, valor_caucao: 2000, extra_franquia_zero: 25, status: "disponivel" },
  { marca_modelo: "Mercedes Classe A", categoria: "Premium", foto_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=250&fit=crop", preco_base_dia: 85, valor_caucao: 1900, extra_franquia_zero: 24, status: "disponivel" },
  { marca_modelo: "Audi A3 Sportback", categoria: "Premium", foto_url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=250&fit=crop", preco_base_dia: 82, valor_caucao: 1800, extra_franquia_zero: 23, status: "disponivel" },
];

export const DEMO_FLEET: Vehicle[] = ROWS.map((r, i) => ({ ...r, id: i + 1 }));

export function fleetOptionLabel(v: Pick<Vehicle, "marca_modelo" | "preco_base_dia" | "categoria">): string {
  return `🚗 ${v.marca_modelo} (${v.categoria}), €${v.preco_base_dia}/dia`;
}

export function resolveFleetVehicle(fleet: Vehicle[], optOrText: string): Vehicle | undefined {
  const lower = optOrText.toLowerCase();
  return fleet.find(
    (v) => lower.includes(v.marca_modelo.toLowerCase()) || optOrText === fleetOptionLabel(v),
  );
}
