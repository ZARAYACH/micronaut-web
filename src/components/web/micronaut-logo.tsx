import { cn } from "@/lib/utils";

export function MicronautLogo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-11 w-[168px] items-center", className)} aria-hidden="true">
      <img
        className="block h-full w-auto object-contain dark:hidden"
        src="/micronaut-assets/logos/micronaut-horizontal-black.svg"
        alt=""
      />
      <img
        className="hidden h-full w-auto object-contain dark:block"
        src="/micronaut-assets/logos/micronaut-horizontal-white.svg"
        alt=""
      />
    </span>
  );
}
