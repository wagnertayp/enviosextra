# Mercado Livre Delivery Partners Platform

## Overview

This project is a comprehensive recruitment platform for Mercado Livre delivery partners targeting the Brazilian market. It's designed as a digital onboarding solution that guides potential delivery partners through registration, vehicle validation, training enrollment, and equipment purchase processes.

## System Architecture

The platform follows a full-stack architecture with clear separation between frontend and backend components:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI components with Tailwind CSS for styling
- **State Management**: Context API for global state management
- **Form Handling**: React Hook Form with Zod validation
- **HTTP Client**: Axios with React Query for API communication
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js 20+ with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom user authentication system
- **API Design**: RESTful API with TypeScript interfaces
- **Deployment**: Multiple deployment strategies (Heroku, Netlify/Vercel split)

## Key Components

### 1. User Registration Flow
- **CEP Validation**: Location-based eligibility checking
- **Multi-step Forms**: Personal data, vehicle information, training preferences
- **Document Validation**: CPF verification and vehicle plate validation
- **Mobile-first Design**: Desktop access blocking with device detection

### 2. Payment Integration
- **Payment Provider**: For4Payments API for PIX payments
- **Python Bridge**: Python wrapper for payment processing
- **Transaction Monitoring**: Real-time payment status tracking
- **Facebook Pixel**: Conversion tracking integration

### 3. Security & Access Control
- **Device Detection**: Mobile-only access enforcement
- **IP Banning System**: Automated desktop access blocking
- **Rate Limiting**: Transaction attempt monitoring
- **CORS Configuration**: Cross-origin request handling

### 4. Content Management
- **Regional Data**: Brazilian states and municipalities
- **Benefits System**: Dynamic benefits display
- **Training Modules**: Course enrollment and payment
- **Equipment Orders**: Safety kit ordering system

## Data Flow

1. **User Entry**: CEP validation determines regional availability
2. **Registration**: Multi-step form captures user data and vehicle information
3. **Validation**: Backend validates documents and vehicle plates via external APIs
4. **Training**: Users select training options and process payments
5. **Equipment**: Safety equipment ordering with address collection
6. **Confirmation**: Email notifications and status updates

## External Dependencies

### APIs and Services
- **For4Payments**: Payment processing for PIX transactions
- **WDAPI2**: Vehicle information validation
- **SendGrid**: Email delivery service
- **Facebook Pixel**: Conversion tracking
- **ViaCEP**: Brazilian postal code validation

### Infrastructure
- **Neon Database**: PostgreSQL hosting
- **Heroku**: Backend deployment
- **Netlify/Vercel**: Frontend deployment options
- **Repl.it**: Development environment

## Deployment Strategy

The project supports multiple deployment strategies:

### Option 1: Unified Heroku Deployment
- Single Heroku dyno running Vite in development mode
- Serves both frontend and backend from the same process
- Uses `heroku-vite-server-standalone.js` for production

### Option 2: Split Deployment
- Frontend: Netlify or Vercel static hosting
- Backend: Heroku API server
- CORS configured for cross-origin requests

### Development Environment
- Repl.it integration with hot module replacement
- PostgreSQL module for database development
- Python environment for payment processing scripts

## Recent Changes

- June 24, 2025: Implemented Zipcodebase radius API integration for Chile municipalities
  - Created GeolocationService with getNearbyMunicipalities method for radius API calls
  - Updated Municipios page to dynamically load cities based on user's postal code
  - Added support for Chile (CL) with 20km radius search for available delivery cities
  - Enhanced UI to show distance and state information for each municipality
  - Integrated fallback to Brazilian static data when not using international postal codes
  - API endpoint: https://app.zipcodebase.com/api/v1/radius with API key fc9584d0-4f0a-11f0-9a26-9f6dbeaee456
- June 24, 2025: Successfully deployed to Heroku
  - Fixed Python/Node.js detection conflict by removing runtime.txt and moving .py files
  - Added .nvmrc file with Node.js 20 specification
  - Updated Heroku stack to heroku-22 for better compatibility
  - Build completed successfully with 3391 modules transformed
  - All assets properly compiled and optimized (fonts, images, CSS)
  - Application successfully deployed and running on Heroku platform
- June 24, 2025: Prepared project for Heroku deployment
  - Removed DialogTitle element from Municipios modal to prevent build errors
  - Updated modal to use yellow background (#FDE80F) with centered Mercado Libre logo
  - Fixed CSS conflicts for loader circle colors to use blue (#2968D7)
  - Created comprehensive heroku-deploy.md documentation
  - Verified all configuration files: Procfile, app.json, runtime.txt, .gitignore
  - Project ready for production deployment with PostgreSQL and environment variables
- June 24, 2025: Updated all loader designs with new Mercado Libre branding
  - Changed LoadingModal to use yellow background (#FDE80F) with centered Mercado Libre logo
  - Updated all circular icons to blue background (#3483FA) with white numbers/checkmarks
  - Applied consistent design across VehicleInfoBox, Municipios page, Dashboard, TreinamentoModal, and Entrega page
  - Logo positioned centered and sized appropriately (h-14) for better visual balance
  - Removed all red color references (#E83D22) in favor of Mercado Libre blue (#3483FA)
- June 24, 2025: Updated vehicle plate validation to accept any text input without format restrictions
  - Removed strict Brazilian license plate format validation
  - Changed minimum length requirement to 3 characters for international compatibility
  - Updated error messages to Spanish for consistent localization
- June 24, 2025: Configuração completa para deploy no Heroku
  - Criado Procfile para execução com npm start
  - Configurado app.json com PostgreSQL e variáveis de ambiente
  - Adicionado runtime.txt especificando Node.js 20.x
  - Configurado servidor para bind 0.0.0.0 (compatível com Heroku)
  - Criado .gitignore para exclusão de arquivos desnecessários
  - Documentação completa de deploy em README.md e heroku-deploy.md
  - Sistema de pagamento configurado para funcionar com dados de demonstração quando APIs não estão disponíveis
- June 24, 2025: Updated payment flow and pricing for Entrega page
  - Changed Kit de Seguridad price from $79,90 to $17 for international market
  - Modified checkout process to redirect to Monetizze payment gateway (DUQ349961)
  - Removed complex PIX payment modal in favor of streamlined external checkout
  - Updated Facebook Pixel tracking to reflect new price and USD currency
- June 24, 2025: Integrated Mercado Pago logo in account linking section
  - Replaced user icon with official Mercado Pago logo from provided URL
  - Updated background styling from blue to white with shadow for better logo visibility
  - Enhanced visual branding consistency in payment account configuration section
- June 23, 2025: Implemented vehicle analysis system with 4-second loading and approval flow
  - Added VehicleAnalysisFlow component with animated progress bar and approval message
  - Modified VehicleInfoBox to use yellow identity visual (#FEE80D) instead of green
  - Simplified approval display to single yellow bar with Mercado Libre branding
  - Removed detailed vehicle information display for cleaner user experience
  - System generates demo data when real API is unavailable for seamless functionality
- June 23, 2025: Updated license field validation for flexible number input
  - Removed automatic CPF formatting pattern (000.000.000-17)
  - Changed validation to accept any number of digits for international compatibility
  - Updated error messages to Spanish for consistent localization
- June 23, 2025: Enhanced Mercado Libre logo size in postal code modal
  - Increased logo dimensions from 20x20 to 32x32 pixels for better brand visibility
  - Maintained centered positioning and responsive design
- June 22, 2025: Installed Meta Pixel in HTML head for proper Facebook tracking
  - Added official Meta Pixel code (ID: 3003244459822861) directly in client/index.html
  - Positioned correctly in head section before closing tag for optimal loading
  - Included noscript fallback for JavaScript-disabled environments
  - Replaced existing React-based pixel implementation with native HTML approach
- June 22, 2025: Updated fuel voucher description to reflect promotional nature for new drivers
  - Changed from monthly recurring benefit to one-time promotional voucher for new partner drivers
  - Updated text from "vale combustible mensual" to "vale combustible promocional" 
  - Clarified this is a welcome benefit for new drivers starting their delivery career
- June 22, 2025: Enhanced account configuration section with premium Mercado Libre design
  - Expanded layout with gradient backgrounds and professional card styling
  - Added comprehensive header with branding and clear purpose explanation
  - Improved visual states with color-coded selection feedback
  - Created separate email input section with detailed information boxes
  - Added conditional continue button that appears only after email completion
- June 22, 2025: Implemented comprehensive IP-based geolocation and postal code validation system
  - Created GeolocationService for automatic country detection via IP address using multiple geolocation APIs
  - Integrated Zipcodebase API for authentic postal code validation across Chile, Argentina, Spain, and Mexico
  - Added country-specific postal code formats: Chile (7 digits), Argentina (A0000AAA), Spain/Mexico (5 digits)
  - Updated CepModal with dynamic country detection display and format-specific input validation
  - Enhanced user experience with real-time country identification and appropriate postal code examples
  - Maintained ViaCEP integration for Brazil while expanding to international markets
  - Added comprehensive error handling and fallback mechanisms for reliable service operation
- June 21, 2025: Created realistic 3D fuel card with Mastercard branding
  - Moved 3D fuel card to standalone section below requirements with "Condición Especial del Mes" title
  - Removed Mercado Pago logo and centered "VALE COMBUSTIBLE" text as main card feature
  - Added Mastercard logo using overlapping red and yellow circles
  - Implemented 3D CSS effects with perspective, rotation, and holographic animation
  - Added Spanish text elements: "VALE COMBUSTIBLE" and "Válido hasta"
  - Created realistic card styling with blue gradient, shadows, and card number formatting
  - Enhanced card size and typography for better standalone presentation
  - Restored Mercado Libre box image to requirements section corner for brand consistency
  - Updated heading typography to medium weight with 20px font size and minimal margins
  - Added automatic date-based promotion description (10-day validity from current date)
  - Made promotion dates bold for better visibility and emphasis
- June 21, 2025: Added $300 amount to fuel card promotional element
  - Added prominent "$300" text below "VALE COMBUSTIBLE" on the 3D fuel card
  - Applied larger font sizing (text-2xl/3xl) for enhanced visibility
  - Centered both card title and amount using flex column layout
  - Enhanced promotional appeal with bold typography and proper spacing
- June 21, 2025: Updated finalization page color scheme to match Mercado Libre branding
  - Changed shoe size selection buttons from red (#E83D22) to Mercado Libre blue (#3483FA)
  - Updated checkbox styling to use blue color scheme with matching hover states
  - Applied blue color palette to submit button and final completion button
  - Updated success icon and next steps section to use consistent blue branding
  - Replaced orange-tinted backgrounds with blue-tinted (#F0F7FF) for visual consistency
- June 21, 2025: Complete Spanish localization of finalization page (/finalizacao)
  - Translated page title "Kit de Segurança" to "Kit de Seguridad"
  - Updated equipment description to "Equipo de Protección Individual (EPI)"
  - Translated all form labels: Talla del Chaleco, Talla de los Guantes, Número del Calzado
  - Updated terms of use text to reference Mercado Libre branding
  - Translated loading modal steps and completion messages to Spanish
  - Applied consistent Spanish terminology throughout safety kit ordering process
- June 22, 2025: Updated registration form with improved user experience
  - Changed placeholder text from numeric patterns to descriptive Spanish text
  - Updated driver's license field: "Insertar número de licencia"
  - Updated phone field: "Insertar número de teléfono"
  - Changed vehicle selection colors from red to Mercado Libre yellow (#FEE80D)
  - Applied yellow-tinted backgrounds (#FFFEF0) for selected vehicle options
- June 21, 2025: Applied Loewe Next font system to registration page (/cadastro)
  - Updated main heading "Registro de Socio Conductor" to use font-loewe-next-heading
  - Applied font-loewe-next-body to all form labels and input descriptions
  - Updated vehicle selection text and buttons with consistent Loewe Next typography
  - Applied font styling to submit button and all interactive elements
  - Completed comprehensive typography standardization across registration workflow
- June 21, 2025: Updated PageTitle component to match breadcrumb design consistency
  - Applied same layout and styling as /cadastro breadcrumb across all pages
  - Updated background to Mercado Libre blue (#3483FA) with curved accent element
  - Replaced styled > character with FontAwesome chevron-right icon
  - Changed text to white with bold styling for visual consistency
  - Updated content from "Repartidor Socio" to "Socio Conductor"
- June 21, 2025: Complete Spanish localization and Mercado Libre branding for registration form
  - Updated registration button from Shopee orange (#E83D22) to Mercado Libre blue (#3483FA)
  - Translated all form fields and labels to Spanish (Registro de Socio Conductor)
  - Updated vehicle selection text and validation messages to Spanish
  - Localized loading modal steps and completion messages
  - Applied consistent Mercado Libre terminology throughout registration flow
- June 21, 2025: Implemented unified breadcrumb system throughout entire project
  - Created reusable Breadcrumb component with Mercado Libre branding
  - Applied consistent blue color scheme (#3483FA) across all workflow pages
  - Updated all breadcrumb text to Spanish: "Socio Conductor Mercado Libre"
  - Replaced Shopee orange branding with Mercado Libre blue throughout application
  - Integrated breadcrumb into Cadastro, Municipios, Entrega, and other workflow pages
- June 21, 2025: Added requirements section to HeroSection below banner image
  - Integrated yellow requirements block with visual arrow connection
  - Listed driver license, vehicle documentation, and accepted vehicle types
  - Added Mercado Libre box illustration for visual appeal
  - Applied Loewe Next typography with consistent blue color scheme (#3483fa)
  - Maintained responsive design and proper spacing for all screen sizes
- June 21, 2025: Updated CEP modal design for cleaner branding
  - Removed "Mercado Libre" text and centered logo for streamlined appearance
  - Centered "Código Postal" label to align with input field
  - Improved header layout with proper flexbox centering
  - Enhanced logo size and positioning for better visual impact
  - Maintained close button functionality while improving overall design
- June 21, 2025: Added "Hazte socio conductor" button to AdvantagesSection
  - Positioned above YouTube video for immediate call-to-action visibility
  - Applied blue background (#3483FA) with white text matching registration button style
  - Integrated CEP modal functionality for seamless registration process
  - Enhanced with shadow effects and hover states for better user experience
- June 21, 2025: Updated InfoSection with comprehensive two-section layout from HTML file
  - Added visual illustrations for both program explanation and income information
  - Created white card design with shadow for the income section
  - Integrated exact content structure with "¿Cómo funciona?" and "Ingresos como Repartidor"
  - Applied proper spacing and typography while maintaining Loewe Next font system
  - Enhanced visual hierarchy with icons and responsive text sizing
- June 21, 2025: Enhanced FAQ section with interactive answers and improved layout
  - Added expandable FAQ items with comprehensive answers for each question
  - Improved spacing and typography for better readability and less cramped appearance
  - Implemented smooth transitions and hover effects for better user experience
  - Increased max-width to 600px and enhanced padding throughout section
- June 21, 2025: Added YouTube video to AdvantagesSection and removed JobOpeningsSection
  - Embedded "¡Entrega paquetes con la App y dale ese EXTRA a tu vida!" video above advantages content
  - Applied rounded borders and responsive styling to video iframe
  - Removed JobOpeningsSection component from Home page for streamlined user experience
- June 21, 2025: Updated FAQSection with new banner and content structure
  - Replaced expandable FAQ cards with simplified question list format
  - Added registration banner with background image and call-to-action
  - Integrated "Ser asociado" button that triggers CEP modal
  - Applied consistent Loewe Next typography throughout section
- June 21, 2025: Removed carousel component from home page
  - Deleted Carousel.tsx component file
  - Updated Home.tsx to remove carousel import and usage
  - Streamlined page flow from HeroSection directly to AdvantagesSection
- June 21, 2025: Typography standardization across entire platform
  - Implemented consistent Loewe Next font system across all components
  - Updated all headings to use font-loewe-next-heading for consistent visual hierarchy
  - Standardized all body text, buttons, and labels to use font-loewe-next-body
  - Applied typography standards to PageTitle, JobOpeningsSection, Footer, CTASection, BenefitsSection, and CepModal components
  - Ensured professional typography consistency throughout the user experience
- June 21, 2025: Page structure reorganization and content updates
  - Created dedicated AdvantagesSection component with authentic Mercado Libre benefits
  - Moved advantages section (Elige, Gana, Cobras) to appear directly after carousel
  - Updated InfoSection to focus on program functionality explanation
  - Integrated official Mercado Libre icons and Spanish localization throughout
- June 21, 2025: Registration steps redesign and UI improvements
  - Simplified registration steps from detailed cards to compact grid layout
  - Fixed carousel arrow colors with CSS specificity override for Mercado Libre blue
  - Updated CTA section with authentic Mercado Libre Envios Extra statistics (18 countries, +50K delivery partners)
  - Removed duplicate registration button from footer for cleaner UX
- June 21, 2025: UI refinements and image updates
  - Updated InfoSection component with precise padding values (pt-[17px] pb-[17px]) for better vertical spacing control
  - Updated HeroSection image source for improved visual presentation
- June 21, 2025: Redesigned benefits section with official Mercado Libre assets
  - Implemented official Mercado Libre SVG icons from their shipping platform
  - Updated benefits content to match official envios.mercadolibre.com.mx structure
  - Added four key benefits: "Conduce por tu ciudad", "Recoge los paquetes", "Reparte en tu ciudad", "Disfruta tus ganancias"
  - Applied Loewe Next-inspired premium typography system throughout platform
  - Enhanced visual hierarchy with improved spacing and hover effects
- June 21, 2025: Complete Spanish localization and Mercado Libre branding update
  - Translated all user-facing text to Spanish (delivery partner program)
  - Updated CEP modal: "Bienvenido a Mercado Libre", "Código Postal"
  - Changed InfoSection to "Repartidores de Mercado Libre" terminology
  - Updated JobOpeningsSection: "Vacantes para Repartidor Socio"
  - Modified BenefitsSection: "Ventajas de ser Repartidor Socio"
  - Updated Footer with Spanish call-to-action buttons
  - Fixed close button functionality in CEP modal
  - Added click-outside-to-close feature for better UX
- June 21, 2025: Updated platform identity to Mercado Libre branding
  - Added Mercado Libre logo and yellow header background (#FEE80D)  
  - Updated primary color scheme from Shopee orange to Mercado Libre blue (#3483FA)
  - Changed all text references from "Shopee" to "Mercado Libre"
  - Updated equipment descriptions to reflect Mercado Libre branding
- June 21, 2025: Fixed database connectivity issues and created PostgreSQL schema

## Changelog

- June 21, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.