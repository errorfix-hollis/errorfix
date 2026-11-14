---
error: "TS2564: Property 'x' has no initializer and is not definitely assigned in the constructor."
error_full: |
  src/app/user.component.ts:9:3 - error TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.

  9   name: string;
      ~~~~
cat: javascript
description: "With strictPropertyInitialization (part of strict mode), TypeScript requires every non-optional class property to be assigned in its declaration or the constructor."
tldr: "Give it a value (`name = ''`), assign it in the constructor, make it optional (`name?: string`) or allow undefined (`name: string | undefined`). If a framework sets it later (Angular @Input/@ViewChild, TypeORM, class-validator DTOs) use the definite assignment assertion: `name!: string`."
keywords: typescript ts2564 property has no initializer and is not definitely assigned in the constructor strictpropertyinitialization definite assignment assertion angular input viewchild typeorm entity dto
related: [js-ts2532-object-is-possibly-undefined, js-ts2322-type-is-not-assignable-to-type, js-ts2339-property-does-not-exist-on-type]
---
## What it means

With `"strict": true` (or `"strictPropertyInitialization": true`, which also needs `strictNullChecks`) TypeScript checks that every class property whose type doesn't include `undefined` actually gets a value by the end of the constructor:

```ts
class User {
  name: string;            // TS2564
  constructor() {}
}
```

Otherwise `new User().name` would be `undefined` at runtime even though the type says `string`. Pick the fix that matches how the property gets its value.

## Fix 1: initialise it

```ts
class User {
  name = "";
  tags: string[] = [];
  createdAt = new Date();
}
```

## Fix 2: assign it in the constructor

```ts
class User {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// shorter: parameter property
class User {
  constructor(public name: string) {}
}
```

Assignments in a helper method called from the constructor (`this.init()`) don't count; TypeScript only looks at the constructor body itself.

## Fix 3: make it optional or nullable

If it can legitimately be missing, say so in the type:

```ts
class User {
  nickname?: string;              // string | undefined
  manager: User | null = null;
}
```

You'll then need to handle `undefined` where you use it (see [TS2532 Object is possibly undefined](/javascript/js-ts2532-object-is-possibly-undefined/)).

## Fix 4: definite assignment assertion `!` (framework-set properties)

When something outside the constructor sets the property before it's used, tell TypeScript with `!`:

**Angular:**

```ts
@Input() user!: User;
@ViewChild("canvas") canvas!: ElementRef<HTMLCanvasElement>;
form!: FormGroup;                 // created in ngOnInit
```

With Angular 17.1+ signal inputs you can avoid it: `user = input.required<User>();`.

**TypeORM / MikroORM entities:**

```ts
@Entity()
export class Post {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
}
```

**NestJS DTOs with class-validator:**

```ts
export class CreateUserDto {
  @IsEmail() email!: string;
}
```

`!` turns the check off for that one property only, so if nothing assigns it you get `undefined` at runtime. Use it only when the framework guarantees the value.

## Fix 5: turn the check off (last resort)

```json
{
  "compilerOptions": {
    "strict": true,
    "strictPropertyInitialization": false
  }
}
```

This disables the check for the whole project. Prefer `!` on specific properties.

## Note on `useDefineForClassFields`

With `target` ES2022 or later, `useDefineForClassFields` defaults to `true`, so a declared-but-unassigned field is initialised to `undefined` by JavaScript itself, which can **overwrite** values set by a base class or decorators. If you just need a type annotation for a property set elsewhere, use `declare`:

```ts
class Dog extends Animal {
  declare owner: Person;    // no runtime field emitted, no TS2564
}
```
