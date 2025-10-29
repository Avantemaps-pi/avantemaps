import React from 'react';
import { FormProvider } from 'react-hook-form';
import { FormValues } from '../formSchema';

interface FormContainerProps {
  form: any;
  onSubmit: (values: FormValues) => Promise<void>;
  children: React.ReactNode;
}

const FormContainer = ({ form, onSubmit, children }: FormContainerProps) => {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 w-full max-w-4xl"
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
};

export default FormContainer;
