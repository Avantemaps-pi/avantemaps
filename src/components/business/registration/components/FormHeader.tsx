
import React from 'react';

interface FormHeaderProps {
  title: string;
  description: string;
}

const FormHeader: React.FC<FormHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-6 md:mb-8">
      <p className="text-muted-foreground text-lg mt-2">
        {description}
      </p>
    </div>
  );
};

export default FormHeader;
