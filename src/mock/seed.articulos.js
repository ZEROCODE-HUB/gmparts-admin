const articulos = [
  { id: "a1", Codigo: "ART-001", Product_type: "Producto", OEM: "OEM-001", Codigo_proveedor: "PROV-001", Nombre_name: "Filtro de Aceite 150A", Marca_brand: "Toyota", Unidad_de_medida_Measurement_unit: "Unidad", Group_Grupo: "Filtros", Subgroup_Subgrupo: "Aceite", Garantia_Warranty: "6 meses", No_Sere_If_Have_Serial_Nr: "No", Stock_minimo_Minimum_Stock: 10, Moneda_Currency: "PEN", Precio_compra_Purchase_price: 25.00, Utilidad_Profit_Percentage: 30, Precio_Venta_Sale_price: 32.50, Codigo_de_Barras_Bar_Code: "1234567890123", Imagen_Picture: "", Ubicacion_Location: "A1-E1", Comentario: "", Precio_Fabrica_P1_FactoryPriceP1: 28.00, Precio_Fabrica_P2_FactoryPriceP2: 27.00, Precio_Fabrica_P3_FactoryPriceP3: 26.00, Precio_Fabrica_PvtaM_FactoryPricePvtaM: 24.00, Fecha_de_Creacion_Created_Date: "2024-01-15", Stock: 150, precioventaconigv: 38.35 },
  { id: "a2", Codigo: "ART-002", Product_type: "Producto", OEM: "OEM-002", Codigo_proveedor: "PROV-001", Nombre_name: "Pastillas de Freno Delanteras", Marca_brand: "Bosch", Unidad_de_medida_Measurement_unit: "Juego", Group_Grupo: "Frenos", Subgroup_Subgrupo: "Pastillas", Garantia_Warranty: "12 meses", No_Sere_If_Have_Serial_Nr: "No", Stock_minimo_Minimum_Stock: 5, Moneda_Currency: "PEN", Precio_compra_Purchase_price: 85.00, Utilidad_Profit_Percentage: 35, Precio_Venta_Sale_price: 114.75, Codigo_de_Barras_Bar_Code: "2345678901234", Imagen_Picture: "", Ubicacion_Location: "B2-E3", Comentario: "", Precio_Fabrica_P1_FactoryPriceP1: 100.00, Precio_Fabrica_P2_FactoryPriceP2: 95.00, Precio_Fabrica_P3_FactoryPriceP3: 90.00, Precio_Fabrica_PvtaM_FactoryPricePvtaM: 82.00, Fecha_de_Creacion_Created_Date: "2024-02-20", Stock: 42, precioventaconigv: 135.41 },
  { id: "a3", Codigo: "ART-003", Product_type: "Producto", OEM: "OEM-003", Codigo_proveedor: "PROV-002", Nombre_name: "Amortiguador Trasero", Marca_brand: "Monroe", Unidad_de_medida_Measurement_unit: "Unidad", Group_Grupo: "Suspensión", Subgroup_Subgrupo: "Amortiguadores", Garantia_Warranty: "12 meses", No_Sere_If_Have_Serial_Nr: "Sí", Stock_minimo_Minimum_Stock: 3, Moneda_Currency: "PEN", Precio_compra_Purchase_price: 120.00, Utilidad_Profit_Percentage: 40, Precio_Venta_Sale_price: 168.00, Codigo_de_Barras_Bar_Code: "3456789012345", Imagen_Picture: "", Ubicacion_Location: "C3-E2", Comentario: "Para Toyota Corolla", Precio_Fabrica_P1_FactoryPriceP1: 145.00, Precio_Fabrica_P2_FactoryPriceP2: 138.00, Precio_Fabrica_P3_FactoryPriceP3: 130.00, Precio_Fabrica_PvtaM_FactoryPricePvtaM: 118.00, Fecha_de_Creacion_Created_Date: "2024-03-10", Stock: 18, precioventaconigv: 198.24 },
  { id: "a4", Codigo: "ART-004", Product_type: "Producto", OEM: "OEM-004", Codigo_proveedor: "PROV-002", Nombre_name: "Bujía NGK Iridium", Marca_brand: "NGK", Unidad_de_medida_Measurement_unit: "Unidad", Group_Grupo: "Encendido", Subgroup_Subgrupo: "Bujías", Garantia_Warranty: "6 meses", No_Sere_If_Have_Serial_Nr: "No", Stock_minimo_Minimum_Stock: 20, Moneda_Currency: "PEN", Precio_compra_Purchase_price: 15.00, Utilidad_Profit_Percentage: 50, Precio_Venta_Sale_price: 22.50, Codigo_de_Barras_Bar_Code: "4567890123456", Imagen_Picture: "", Ubicacion_Location: "A1-E5", Comentario: "", Precio_Fabrica_P1_FactoryPriceP1: 19.00, Precio_Fabrica_P2_FactoryPriceP2: 18.00, Precio_Fabrica_P3_FactoryPriceP3: 17.00, Precio_Fabrica_PvtaM_FactoryPricePvtaM: 14.00, Fecha_de_Creacion_Created_Date: "2024-04-05", Stock: 500, precioventaconigv: 26.55 },
  { id: "a5", Codigo: "ART-005", Product_type: "Producto", OEM: "OEM-005", Codigo_proveedor: "PROV-003", Nombre_name: "Aceite Motor 20W50 1L", Marca_brand: "Mobil", Unidad_de_medida_Measurement_unit: "Litro", Group_Grupo: "Lubricantes", Subgroup_Subgrupo: "Aceite Motor", Garantia_Warranty: "", No_Sere_If_Have_Serial_Nr: "No", Stock_minimo_Minimum_Stock: 50, Moneda_Currency: "PEN", Precio_compra_Purchase_price: 12.00, Utilidad_Profit_Percentage: 45, Precio_Venta_Sale_price: 17.40, Codigo_de_Barras_Bar_Code: "5678901234567", Imagen_Picture: "", Ubicacion_Location: "D1-E1", Comentario: "", Precio_Fabrica_P1_FactoryPriceP1: 15.00, Precio_Fabrica_P2_FactoryPriceP2: 14.50, Precio_Fabrica_P3_FactoryPriceP3: 14.00, Precio_Fabrica_PvtaM_FactoryPricePvtaM: 11.50, Fecha_de_Creacion_Created_Date: "2024-01-20", Stock: 200, precioventaconigv: 20.53 },
];

export const marcasSeed = [
  { id: "m1", nombre: "Toyota" }, { id: "m2", nombre: "Bosch" },
  { id: "m3", nombre: "Monroe" }, { id: "m4", nombre: "NGK" },
  { id: "m5", nombre: "Mobil" }, { id: "m6", nombre: "Hella" },
  { id: "m7", nombre: "Valeo" }, { id: "m8", nombre: "SKF" },
  { id: "m9", nombre: "Continental" }, { id: "m10", nombre: "ACDelco" },
];

export const gruposSeed = [
  { id: "g1", nombre: "Filtros" }, { id: "g2", nombre: "Frenos" },
  { id: "g3", nombre: "Suspensión" }, { id: "g4", nombre: "Encendido" },
  { id: "g5", nombre: "Lubricantes" }, { id: "g6", nombre: "Motor" },
  { id: "g7", nombre: "Eléctrico" }, { id: "g8", nombre: "Transmisión" },
];

export const subgruposSeed = [
  { id: "sg1", nombre: "Aceite", grupo: "g1" }, { id: "sg2", nombre: "Pastillas", grupo: "g2" },
  { id: "sg3", nombre: "Amortiguadores", grupo: "g3" }, { id: "sg4", nombre: "Bujías", grupo: "g4" },
  { id: "sg5", nombre: "Aceite Motor", grupo: "g5" }, { id: "sg6", nombre: "Correas", grupo: "g6" },
  { id: "sg7", nombre: "Luces", grupo: "g7" }, { id: "sg8", nombre: "Embrague", grupo: "g8" },
];

export const unidadesSeed = [
  { id: "u1", nombre: "Unidad" }, { id: "u2", nombre: "Juego" },
  { id: "u3", nombre: "Litro" }, { id: "u4", nombre: "Kilogramo" },
  { id: "u5", nombre: "Metro" }, { id: "u6", nombre: "Caja" },
];

export const monedasSeed = ["PEN", "USD"];
export const productTypesSeed = ["Producto", "Servicio"];
export const warrantySeed = ["1 mes", "3 meses", "6 meses", "12 meses", "24 meses"];
export const serialSeed = ["Sí", "No"];

export default articulos;
