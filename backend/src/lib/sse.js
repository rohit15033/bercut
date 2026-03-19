const clients = {};  // { branch_id: Set<Response> }

export function addClient(branch_id, res) {
  if (!clients[branch_id]) clients[branch_id] = new Set();
  clients[branch_id].add(res);
}
export function removeClient(branch_id, res) {
  clients[branch_id]?.delete(res);
}
export function broadcastToBranch(branch_id, data) {
  clients[branch_id]?.forEach(res =>
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  );
}
