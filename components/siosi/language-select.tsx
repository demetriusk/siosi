"use client";

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectProps {
  locale: string;
  onChangeClose?: () => void;
}

export default function LanguageSelect({ locale, onChangeClose }: LanguageSelectProps) {
  const router = useRouter();

  return (
    <Select
      defaultValue={locale}
      onValueChange={(val: string) => {
        if (onChangeClose) onChangeClose();
        const pathWithoutLocale = typeof window !== 'undefined' ? window.location.pathname.replace(`/${locale}`, '') : '';
        router.push(`/${val}${pathWithoutLocale}`);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Español</SelectItem>
        <SelectItem value="ru">Русский</SelectItem>
        <SelectItem value="pt">Português</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="de">Deutsch</SelectItem>
        <SelectItem value="it">Italiano</SelectItem>
        <SelectItem value="ua">Українська</SelectItem>
      </SelectContent>
    </Select>
  );
}
