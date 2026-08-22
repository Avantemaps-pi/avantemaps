
import React from 'react';
import { FormProvider, UseFormReturn, SubmitErrorHandler } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { FormValues } from '../formSchema';

interface FormContainerProps {
  form: UseFormReturn<FormValues>;
  onSubmit: (values: FormValues) => Promise<void>;
  onInvalid?: SubmitErrorHandler<FormValues>;
  children: React.ReactNode;
  isSubmitting?: boolean;
}

const FormContainer = ({ form, onSubmit, onInvalid, children, isSubmitting }: FormContainerProps) => {
  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit, onInvalid)} 
          className="space-y-6 w-full max-w-2xl mx-auto"
        >

          {children}
        </form>
      </Form>
    </FormProvider>
  );
};

export default FormContainer;
