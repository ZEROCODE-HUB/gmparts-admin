// Validación de vehículos.
//
// La placa es la llave natural de un taller: es lo que se teclea para buscar, lo que sale en
// la orden y lo que dice el cliente por teléfono. En la base hay CUATRO vehículos con la placa
// «2907TEST» y años de fabricación como 30073 o 1234, así que hasta ahora no se comprobaba
// nada. Con placas repetidas, el asesor elige un vehículo de la lista y no sabe si es el que
// tiene delante.

const ANIO_MINIMO = 1900;

/**
 * Normaliza una placa para comparar: mayúsculas y sin guiones ni espacios.
 * «b1d-123» y «B1D123» son la misma placa y deben chocar entre sí.
 */
export function normalizarPlaca(placa) {
  return String(placa ?? "").toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Formato de placa. Se admite cualquier combinación de 5 a 8 letras y números: las peruanas
 * actuales son 3 letras + 3 dígitos, pero circulan formatos antiguos y de otros países, y
 * bloquear un vehículo real por el formato sería peor que el problema que se quiere evitar.
 */
export function validarPlaca(placa) {
  const p = normalizarPlaca(placa);
  if (!p) return { ok: false, error: "Falta la placa." };
  if (!/^[A-Z0-9]+$/.test(p)) return { ok: false, error: "La placa solo puede tener letras y números." };
  if (p.length < 5 || p.length > 8) {
    return { ok: false, error: `Una placa tiene entre 5 y 8 caracteres (esta tiene ${p.length}).` };
  }
  return { ok: true };
}

/**
 * Año de fabricación o de modelo. Vacío se admite: no siempre se conoce, y obligar a
 * inventarlo produce datos peores que no tenerlos.
 *
 * `anioActual` se pasa como parámetro para que la prueba no dependa de la fecha del día.
 */
export function validarAnio(anio, anioActual = new Date().getFullYear()) {
  const v = String(anio ?? "").trim();
  if (!v) return { ok: true };
  if (!/^\d{4}$/.test(v)) return { ok: false, error: "El año debe tener 4 cifras." };

  const n = Number(v);
  const maximo = anioActual + 1;   // los modelos del año siguiente ya se venden
  if (n < ANIO_MINIMO || n > maximo) {
    return { ok: false, error: `El año debe estar entre ${ANIO_MINIMO} y ${maximo}.` };
  }
  return { ok: true };
}

/**
 * Todas las comprobaciones que no necesitan consultar la base.
 * La unicidad de la placa se comprueba aparte, en el formulario, porque exige una lectura.
 */
export function validarVehiculo(form, anioActual = new Date().getFullYear()) {
  const placa = validarPlaca(form?.Placa);
  if (!placa.ok) return placa;

  const fabricacion = validarAnio(form?.anio_de_fabricion, anioActual);
  if (!fabricacion.ok) return { ok: false, error: `Año de fabricación: ${fabricacion.error}` };

  const modelo = validarAnio(form?.aniodemodelo, anioActual);
  if (!modelo.ok) return { ok: false, error: `Año de modelo: ${modelo.error}` };

  return { ok: true };
}
