/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite acessar o servidor de dev por IP da rede local (apresentações,
  // testes em outro dispositivo) — sem isso o Next bloqueia os assets
  // estáticos (_next/*) vindos de uma origem diferente de localhost e a
  // página nunca hidrata (os formulários ficam sem funcionar).
  allowedDevOrigins: ["192.168.2.104", "192.168.2.166"],
};

export default nextConfig;
