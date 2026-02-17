import { useToast } from "@/hooks/use-toast";

/**
 * Hook to show a "Coming soon" toast notification
 * Reusable across the application for features not yet implemented
 * 
 * @example
 * const showComingSoon = useComingSoon();
 * <Button onClick={showComingSoon}>Feature</Button>
 */
export function useComingSoon() {
    const { toast } = useToast();

    return () => {
        toast({
            title: "Coming soon",
            description: "This feature is not yet available."
        });
    };
}
