import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { getActiveServices } from '../utils/servicesManager';
import { serviceCategories } from '../data/services';
import { Sparkles, Hand, Heart, Scissors, Flower, ShoppingBag, Plus, Minus } from 'lucide-react';

interface ServiceSelectorProps {
  onServiceSelect: (services: Service[]) => void;
}

const iconMap = {
  Sparkles,
  Hand,
  Heart,
  Scissors,
  Flower,
  ShoppingBag
};

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ onServiceSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState(serviceCategories[0].id);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);

  useEffect(() => {
    getActiveServices().then(setAllServices);
  }, []);

  const categoryServices = allServices.filter(service => service.category === selectedCategory);

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.find(s => s.id === service.id);
    let newSelection: Service[];
    
    if (isSelected) {
      newSelection = selectedServices.filter(s => s.id !== service.id);
    } else {
      newSelection = [...selectedServices, service];
    }
    
    setSelectedServices(newSelection);
  };

  const handleContinue = () => {
    if (selectedServices.length > 0) {
      onServiceSelect(selectedServices);
    }
  };

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  return (
    <div>
      {/* Category Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {serviceCategories.map(category => {
          const IconComponent = iconMap[category.icon as keyof typeof iconMap];
          const categoryHasServices = allServices.some(s => s.category === category.id);
          
          if (!categoryHasServices) return null;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <IconComponent className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium text-center">{category.name}</p>
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {categoryServices.map(service => {
          const isSelected = selectedServices.find(s => s.id === service.id);
          return (
            <div
              key={service.id}
              className={`relative bg-white border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => toggleService(service)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected ? (
                    <Plus className="w-4 h-4 text-white rotate-45" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{service.description}</p>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <span>{service.duration} min</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  ${service.price}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categoryServices.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay servicios disponibles en esta categoría.</p>
        </div>
      )}

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">Servicios Seleccionados</h3>
          
          <div className="space-y-2 mb-4">
            {selectedServices.map(service => (
              <div key={service.id} className="flex justify-between items-center text-sm">
                <span className="text-blue-700">{service.name}</span>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">{service.duration} min</span>
                  <span className="font-semibold text-blue-800">${service.price}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleService(service);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-blue-200 pt-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-blue-600">
                <span>Duración total: {totalDuration} minutos</span>
              </div>
              <div className="text-xl font-bold text-blue-800">
                Total: ${totalPrice}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleContinue}
            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
          >
            Continuar con la Reserva
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceSelector;