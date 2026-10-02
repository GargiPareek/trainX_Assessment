import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true, trim: true, minlength: 2, maxlength: 100 })
  name!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 })
  email!: string;

  @Prop({ type: String, required: true, minlength: 10, maxlength: 20 })
  phone!: string;

  @Prop({ type: String, required: true, trim: true, unique: true, maxlength: 100 })
  studentId!: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  @Prop({ type: Boolean, default: true, required: true })
  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
