interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

const FormSection = ({ title, children }: FormSectionProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export default FormSection;
