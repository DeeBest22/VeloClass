import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      gap={10}
      toastOptions={{
        duration: 4000,
        classNames: {
          toaster: "cs-toaster",
          toast: "cs-toast",
          title: "cs-toast-title",
          description: "cs-toast-description",
          actionButton: "cs-toast-action",
          cancelButton: "cs-toast-cancel",
          closeButton: "cs-toast-close",
          success: "cs-toast--success",
          error: "cs-toast--error",
          warning: "cs-toast--warning",
          info: "cs-toast--info",
          loading: "cs-toast--loading",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };