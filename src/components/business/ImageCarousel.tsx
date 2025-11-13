
import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  currentIndex: number;
  onImageChange: (index: number) => void;
  onReorder?: (newOrder: string[]) => void;
}

interface SortableImageProps {
  image: string;
  index: number;
  id: string;
}

const SortableImage: React.FC<SortableImageProps> = ({ image, index, id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div className="h-64 w-full bg-muted/30 rounded-md flex items-center justify-center">
        <img 
          src={image} 
          alt={`Business image ${index + 1}`}
          className="max-w-full max-h-full object-contain rounded-md"
        />
      </div>
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  currentIndex, 
  onImageChange,
  onReorder
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = images.findIndex((_, idx) => `image-${idx}` === active.id);
      const newIndex = images.findIndex((_, idx) => `image-${idx}` === over.id);
      
      const newImages = arrayMove(images, oldIndex, newIndex);
      onReorder(newImages);
      
      // Update current index if the current image was moved
      if (oldIndex === currentIndex) {
        onImageChange(newIndex);
      } else if (oldIndex < currentIndex && newIndex >= currentIndex) {
        onImageChange(currentIndex - 1);
      } else if (oldIndex > currentIndex && newIndex <= currentIndex) {
        onImageChange(currentIndex + 1);
      }
    }
  };

  return (
    <div className="w-full space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Carousel className="w-full">
          <CarouselContent>
            <SortableContext
              items={images.map((_, idx) => `image-${idx}`)}
              strategy={horizontalListSortingStrategy}
            >
              {images.map((image, index) => (
                <CarouselItem key={`image-${index}`}>
                  <SortableImage
                    id={`image-${index}`}
                    image={image}
                    index={index}
                  />
                </CarouselItem>
              ))}
            </SortableContext>
          </CarouselContent>
          {images.length > 1 && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      </DndContext>
      
      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-2">
        {images.map((_, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className={cn(
              "w-2 h-2 p-0 rounded-full",
              index === currentIndex 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-gray-200 hover:bg-gray-300"
            )}
            onClick={() => onImageChange(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
