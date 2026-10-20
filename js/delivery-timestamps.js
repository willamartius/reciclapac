/* ---------- CRONOLOGIA DE REGISTRO DAS ENTREGAS ---------- */
function normalizarTimestampRegistro(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  let data;
  if (valor instanceof Date) {
    data = valor;
  } else if (typeof valor === 'number' && Number.isFinite(valor)) {
    // Firestore timestamps podem chegar como segundos; Date.now() usa milissegundos.
    data = new Date(Math.abs(valor) < 1e11 ? valor * 1000 : valor);
  } else if (typeof valor === 'string') {
    const milissegundos = Date.parse(valor);
    if (!Number.isFinite(milissegundos)) return null;
    data = new Date(milissegundos);
  } else if (valor && typeof valor.toDate === 'function') {
    try { data = valor.toDate(); } catch (_) { return null; }
  } else if (valor && typeof valor.seconds === 'number' && Number.isFinite(valor.seconds)) {
    const nanos = Number.isFinite(valor.nanoseconds) ? valor.nanoseconds : 0;
    data = new Date(valor.seconds * 1000 + nanos / 1e6);
  } else {
    return null;
  }

  const milissegundos = data instanceof Date ? data.getTime() : NaN;
  return Number.isFinite(milissegundos) ? milissegundos : null;
}

function ordenarEntregasPorRegistro(entregas) {
  return (Array.isArray(entregas) ? entregas : [])
    .map((entrega, indice) => ({
      entrega,
      indice,
      timestamp: normalizarTimestampRegistro(entrega && entrega.criadoEm),
    }))
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null && a.timestamp !== b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      // Registros sem horário confiável ficam depois dos registros datados.
      // Entre eles, usa-se a data informada, sem tratá-la como horário de criação.
      if (a.timestamp !== null && b.timestamp === null) return -1;
      if (a.timestamp === null && b.timestamp !== null) return 1;
      const dataA = typeof a.entrega?.data === 'string' ? a.entrega.data : '';
      const dataB = typeof b.entrega?.data === 'string' ? b.entrega.data : '';
      const diferencaData = dataB.localeCompare(dataA);
      return diferencaData || a.indice - b.indice;
    })
    .map(item => item.entrega);
}

function formatarDataHoraRegistro(valor) {
  const timestamp = normalizarTimestampRegistro(valor);
  if (timestamp === null) return 'Horário não disponível';
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizarTimestampRegistro,
    ordenarEntregasPorRegistro,
    formatarDataHoraRegistro,
  };
}
