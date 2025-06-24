interface BreadcrumbProps {
  title?: string;
  subtitle?: string;
}

export default function Breadcrumb({ 
  title = "Socio Conductor", 
  subtitle = "Mercado Libre" 
}: BreadcrumbProps) {
  return (
    <div className="w-full bg-[#3483FA] py-1 px-6 flex items-center relative overflow-hidden">
      {/* Meia-lua no canto direito */}
      <div className="absolute right-0 top-0 bottom-0 w-32 h-full rounded-l-full bg-[#2968D7]"></div>
      
      <div className="flex items-center relative z-10">
        <div className="text-white mr-3">
          <i className="fas fa-chevron-right text-3xl font-black" style={{color: 'white'}}></i>
        </div>
        <div className="leading-none">
          <h1 className="text-base font-bold text-white mb-0">{title}</h1>
          <p className="text-white text-sm mt-0" style={{transform: 'translateY(-2px)'}}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}