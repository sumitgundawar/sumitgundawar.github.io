import React from 'react';

interface SimpleMapProps {
  className?: string;
}

const SimpleMap: React.FC<SimpleMapProps> = ({ className }) => {
  return (
    <div className={`w-full overflow-hidden rounded-lg shadow-md ${className}`}>
      <iframe
        title="London Map"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d158858.47340002653!2d-0.24168120642536509!3d51.52855824164916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2sLondon%2C%20UK!5e0!3m2!1sen!2sus!4v1716051600000!5m2!1sen!2sus"
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '250px' }}
        allowFullScreen={true}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  );
};

export default SimpleMap;