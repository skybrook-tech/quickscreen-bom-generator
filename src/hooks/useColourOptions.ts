import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ColourOption {
  value: string;
  short_code: string;
  label: string;
  finish_group: string;
  limited: boolean;
  sort_order: number;
}

// Hardcoded placeholder used while the DB query is in-flight so the colour
// select is never empty on initial render. Replaced by DB data once loaded.
const COLOUR_PLACEHOLDER: ColourOption[] = [
  { value: 'black-satin',            short_code: 'B',   label: 'Black Satin',                   finish_group: 'standard',  limited: false, sort_order: 10  },
  { value: 'monument-matt',          short_code: 'MN',  label: 'Monument Matt',                 finish_group: 'standard',  limited: false, sort_order: 20  },
  { value: 'woodland-grey-matt',     short_code: 'G',   label: 'Woodland Grey Matt',            finish_group: 'standard',  limited: false, sort_order: 30  },
  { value: 'surfmist-matt',          short_code: 'SM',  label: 'Surfmist Matt',                 finish_group: 'standard',  limited: false, sort_order: 40  },
  { value: 'pearl-white-gloss',      short_code: 'W',   label: 'Pearl White Gloss',             finish_group: 'standard',  limited: false, sort_order: 50  },
  { value: 'basalt-satin',           short_code: 'BS',  label: 'Basalt Satin',                  finish_group: 'standard',  limited: false, sort_order: 60  },
  { value: 'dune-satin',             short_code: 'D',   label: 'Dune Satin',                    finish_group: 'standard',  limited: false, sort_order: 70  },
  { value: 'mill',                   short_code: 'M',   label: 'Mill (raw aluminium)',          finish_group: 'standard',  limited: false, sort_order: 80  },
  { value: 'primrose',               short_code: 'P',   label: 'Primrose',                      finish_group: 'standard',  limited: true,  sort_order: 90  },
  { value: 'paperbark',              short_code: 'PB',  label: 'Paperbark',                     finish_group: 'standard',  limited: true,  sort_order: 100 },
  { value: 'palladium-silver-pearl', short_code: 'S',   label: 'Palladium Silver Pearl',        finish_group: 'standard',  limited: false, sort_order: 110 },
  { value: 'kwila',                  short_code: 'KWI', label: 'Kwila (Alumawood)',             finish_group: 'alumawood', limited: false, sort_order: 120 },
  { value: 'western-red-cedar',      short_code: 'WRC', label: 'Western Red Cedar (Alumawood)', finish_group: 'alumawood', limited: false, sort_order: 130 },
  { value: 'island-grey',            short_code: 'IG',  label: 'Island Grey (Alumawood)',       finish_group: 'alumawood', limited: false, sort_order: 140 },
];

export function useColourOptions() {
  return useQuery<ColourOption[]>({
    queryKey: ['colour-options'],
    staleTime: 30 * 60_000,
    placeholderData: COLOUR_PLACEHOLDER,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colour_options')
        .select('value, short_code, label, finish_group, limited, sort_order')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}
