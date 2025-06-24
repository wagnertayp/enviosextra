import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface LoadingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  loadingSteps: string[];
  title: string;
  completionMessage: string;
  loadingTime?: number;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  onComplete,
  loadingSteps,
  title,
  completionMessage,
  loadingTime = 7000
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [finishText, setFinishText] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !loadingSteps || loadingSteps.length === 0) {
      // Reset state when modal is closed or no steps provided
      setCurrentStep(0);
      setIsComplete(false);
      setFinishText('');
      return;
    }

    const stepInterval = loadingTime / (loadingSteps.length + 1);
    
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        } else if (prev === loadingSteps.length - 1 && !isComplete) {
          setIsComplete(true);
          setFinishText(completionMessage);
          setTimeout(() => {
            onComplete();
          }, 1500);
          return prev;
        }
        return prev;
      });
    }, stepInterval);

    return () => {
      clearInterval(timer);
    };
  }, [isOpen, loadingSteps?.length, onComplete, completionMessage, loadingTime]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent className="p-0 sm:max-w-none w-full h-full max-h-screen overflow-hidden border-none shadow-none bg-[#FDE80F]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Processando sua solicitação...</DialogDescription>
        
        <div className="absolute top-0 left-0 w-full h-full bg-[#FDE80F] z-0"></div>
        
        <div className="relative flex flex-col justify-center items-center h-screen bg-transparent z-10">
          {/* Mercado Libre Logo - centered and smaller */}
          <div className="mb-8">
            <img 
              src="https://i.postimg.cc/j5Mnz0Tm/mercadolibre-logo-7-D54-D946-AE-seeklogo-com.png" 
              alt="Mercado Libre"
              className="h-14 w-auto object-contain"
            />
          </div>
          
          {/* Status Modal */}
          <div className="w-11/12 max-w-md">
            <h2 className="font-loewe-next-heading font-semibold text-lg text-center mb-6 text-gray-800">{title}</h2>

            <div className="space-y-3">
              {loadingSteps && loadingSteps.map((step, index) => (
                <div 
                  key={index} 
                  id={`status${index+1}`} 
                  className={`status-item flex items-center p-3 bg-white bg-opacity-80 rounded-lg shadow-sm ${index <= currentStep ? 'active' : ''}`}
                >
                  <div className={`status-icon text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 ${index <= currentStep ? 'bg-[#2968D7]' : 'bg-[#2968D7]'}`}>
                    {index < currentStep ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className={`status-text text-sm font-loewe-next-body ${index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {step}
                  </div>
                </div>
              )) || []}
            </div>
            
            {isComplete && (
              <div className="mt-6 p-4 bg-white bg-opacity-90 rounded-lg border border-green-200 shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <div className="bg-green-500 text-white rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="text-center text-green-700 font-medium font-loewe-next-body">
                  {finishText}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};