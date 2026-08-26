export default function handler(_request: unknown, response: any): void {
  response.status(200).json({ ok: true });
}
