import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Cadastro from "@/pages/Cadastro";
import Municipios from "@/pages/Municipios";
import Recebedor from "@/pages/Recebedor";
import Finalizacao from "@/pages/Finalizacao";
import Entrega from "@/pages/Entrega";
import Dashboard from "@/pages/Dashboard";
import Payment from "@/pages/Payment";
import Treinamento from "@/pages/Treinamento";
import PagamentoInstrutor from "@/pages/PagamentoInstrutor";
import { useAppContext } from "@/contexts/AppContext";

import FacebookPixelInitializer from "@/components/FacebookPixelInitializer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/municipios" component={Municipios} />
      <Route path="/recebedor" component={Recebedor} />
      <Route path="/finalizacao" component={Finalizacao} />
      <Route path="/entrega" component={Entrega} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/payment" component={Payment} />
      <Route path="/treinamento" component={Treinamento} />
      <Route path="/pagamento-instrutor" component={PagamentoInstrutor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  
  return (
    <TooltipProvider>
      <Toaster />
      <FacebookPixelInitializer />
      <Router />
    </TooltipProvider>
  );
}

export default App;