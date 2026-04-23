export const MATERIALS = [
    { id: "cu_pb_alloy",    label: "Copper-Lead Alloy",                density_gcc: 10.85 },
    { id: "c10100",         label: "C10100 — OFE Copper",              density_gcc: 9.84  },
    { id: "bismuth",        label: "Bismuth",                          density_gcc: 9.78  },
    { id: "cupronickel",    label: "Cupronickel (90Cu/10Ni)",          density_gcc: 8.94  },
    { id: "c21000",         label: "C21000 — Gilding Metal (95Cu/5Zn)",density_gcc: 8.86  },
    { id: "c26000",         label: "C26000 — Cartridge Brass (70/30)", density_gcc: 8.53  },
    { id: "steel_4140",     label: "Steel 4140",                       density_gcc: 7.85  },
    { id: "tin",            label: "Tin (pure)",                       density_gcc: 7.29  },
    { id: "zinc",           label: "Zinc (pure)",                      density_gcc: 7.13  },
    { id: "tungsten",       label: "Tungsten (pure)",                  density_gcc: 19.30 },
];

export function getMaterialById(id) {
    return MATERIALS.find(m => m.id === id) ?? MATERIALS[0];
}

