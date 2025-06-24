import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CepData {
  cep: string;
  city: string;
  state: string;
}

interface AppContextType {
  cepData: CepData | null;
  setCepData: (data: CepData | null) => void;
  showCepModal: boolean;
  setShowCepModal: (show: boolean) => void;
  userCheckedCep: boolean;
  setUserCheckedCep: (checked: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [cepData, setCepData] = useState<CepData | null>(null);
  const [showCepModal, setShowCepModal] = useState(false);
  const [userCheckedCep, setUserCheckedCep] = useState(false);
  
  // Não vamos carregar automaticamente os dados de CEP aqui
  // Cada página individual decidirá se deve mostrar o modal de CEP ou não
  
  // Salvar dados de CEP no localStorage quando eles mudarem
  useEffect(() => {
    if (cepData) {
      localStorage.setItem('shopee_delivery_cep_data', JSON.stringify(cepData));
    }
  }, [cepData]);
  
  return (
    <AppContext.Provider 
      value={{ 
        cepData, 
        setCepData, 
        showCepModal, 
        setShowCepModal,
        userCheckedCep,
        setUserCheckedCep
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  }
  return context;
};