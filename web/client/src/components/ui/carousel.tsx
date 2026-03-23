import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";

const CarouselContext = React.createContext<any>(null);
function Carousel({ children, className, ...props }: any) {
  const [emblaRef, emblaApi] = useEmblaCarousel(props.opts);
  return <CarouselContext.Provider value={{ emblaRef, emblaApi }}><div className={className} {...props}>{children}</div></CarouselContext.Provider>;
}
function CarouselContent({ className, ...props }: any) {
  const { emblaRef } = React.useContext(CarouselContext) || {};
  return <div ref={emblaRef} className="overflow-hidden"><div className={className} {...props} /></div>;
}
function CarouselItem({ className, ...props }: any) { return <div className={className} {...props} />; }
function CarouselPrevious(props: any) { return <button {...props}>←</button>; }
function CarouselNext(props: any) { return <button {...props}>→</button>; }
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
