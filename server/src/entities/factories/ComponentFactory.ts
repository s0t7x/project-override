import { TransformComponent } from "../components/TransformComponent";
import { Component } from "../core/Component";
import { Entity } from "../core/Entity";

type ComponentConstructor = new (entity: Entity) => Component;

export class ComponentFactory {
    private static ParsableComponents = new Map<string, ComponentConstructor>([
        ['transform', TransformComponent as ComponentConstructor]
    ]);

    static createComponent(entity: Entity, key: string, config: any): Component | null {
        const ComponentClass = this.ParsableComponents.get(key);
            if (!ComponentClass) {
                console.warn(`Unknown component type: ${key}`);
                return null
            }

            const component = new ComponentClass(entity);

            if (typeof component.deserialize === 'function') {
                component.deserialize(config);
            } else {
                console.warn(`Component ${key} has no deserialize method.`);
            }

            if (typeof component.initialize === 'function') {
                component.initialize();
            }

            return component;
    }

    static createAndAddComponents(entity: Entity, componentsJSON: Record<string, any>): void {
        for (const [key, config] of Object.entries(componentsJSON)) {
            const component = ComponentFactory.createComponent(entity, key, config);
            if(component)
                entity.addComponent(component);
        }
    }
}