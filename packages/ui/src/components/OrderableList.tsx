"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

type SortableItemState = ReturnType<typeof useSortable>;

export type OrderableItemState = Pick<
  SortableItemState,
  "attributes" | "listeners" | "setActivatorNodeRef"
> & {
  disabled: boolean;
  isDragging: boolean;
};

type OrderableListProps<Item> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  getId: (item: Item) => string;
  items: readonly Item[];
  layout?: "grid" | "vertical";
  onReorder: (items: Item[]) => void;
  renderItem: (item: Item, state: OrderableItemState) => ReactNode;
};

function OrderableItem<Item>({
  disabled,
  id,
  item,
  renderItem,
}: {
  disabled: boolean;
  id: string;
  item: Item;
  renderItem: OrderableListProps<Item>["renderItem"];
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ disabled, id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <li className="relative" ref={setNodeRef} style={style}>
      {renderItem(item, {
        attributes,
        disabled,
        isDragging,
        listeners,
        setActivatorNodeRef,
      })}
    </li>
  );
}

export function OrderableList<Item>({
  ariaLabel,
  className,
  disabled = false,
  getId,
  items,
  layout = "vertical",
  onReorder,
  renderItem,
}: OrderableListProps<Item>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previousIndex = ids.indexOf(String(active.id));
    const nextIndex = ids.indexOf(String(over.id));
    if (previousIndex === -1 || nextIndex === -1) return;
    onReorder(arrayMove([...items], previousIndex, nextIndex));
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={ids}
        strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <ul aria-label={ariaLabel} className={className}>
          {items.map((item) => {
            const id = getId(item);
            return (
              <OrderableItem
                disabled={disabled}
                id={id}
                item={item}
                key={id}
                renderItem={renderItem}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
