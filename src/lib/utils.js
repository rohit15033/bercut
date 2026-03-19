export const fmt  = n => "Rp " + n.toLocaleString("id-ID");
export const fmtK = n => "Rp " + (n / 1000).toFixed(0) + "k";
export const today = () => new Date().toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
