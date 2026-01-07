import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import SimpleMap from './SimpleMap';

interface LocationModalProps {
  className?: string;
}

const LocationModal = ({ className }: LocationModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="lg" 
          className={`flex items-center gap-2 card-hover ${className}`}
          onClick={() => {
            // Track this interaction in Google Analytics
            if (typeof window !== 'undefined' && window.gtag) {
              window.gtag('event', 'open_location_modal', {
                event_category: 'engagement',
                event_label: 'London Map Modal'
              });
            }
          }}
        >
          <MapPin className="w-4 h-4" /> London, UK
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold font-space-grotesk text-foreground">
            Location: London, United Kingdom
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <SimpleMap className="h-[350px]" />
          <div className="mt-4 text-center text-muted-foreground">
            <p>Based in London, with flexibility to work remotely or relocate for the right opportunity.</p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button 
              className="bg-portfolio-blue hover:bg-portfolio-dark-blue"
              onClick={() => {
                window.open('https://www.google.com/maps/place/London,+UK', '_blank');
                
                // Track this interaction in Google Analytics
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'view_full_map', {
                    event_category: 'engagement',
                    event_label: 'View Full Map Button'
                  });
                }
              }}
            >
              Open in Google Maps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationModal;
