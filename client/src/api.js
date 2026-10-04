export async function getAssetStatus(){
  const response=await fetch("/api/assets/status");
  if(!response.ok) throw new Error("asset service unavailable");
  return response.json();
}
