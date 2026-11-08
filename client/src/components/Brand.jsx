import { Droplet } from 'lucide-react';

export default function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Droplet size={23} strokeWidth={1.8} />
      </span>
      <span>
        sweety<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
