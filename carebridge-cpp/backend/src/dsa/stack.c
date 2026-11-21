#include "stack.h"
#include <stdlib.h>
void cb_stack_init(CBStack*s){if(s){s->top=NULL;s->size=0;}}
int cb_stack_push(CBStack*s,int v){if(!s)return 0;CBStackNode*n=(CBStackNode*)malloc(sizeof(*n));if(!n)return 0;n->value=v;n->next=s->top;s->top=n;s->size++;return 1;}
int cb_stack_pop(CBStack*s,int*out){if(!s||!s->top)return 0;CBStackNode*n=s->top;if(out)*out=n->value;s->top=n->next;s->size--;free(n);return 1;}
int cb_stack_peek(const CBStack*s,int*out){if(!s||!s->top||!out)return 0;*out=s->top->value;return 1;}
size_t cb_stack_display(const CBStack*s,int*out,size_t cap){if(!s)return 0;size_t n=0;for(CBStackNode*p=s->top;p;p=p->next){if(out&&n<cap)out[n]=p->value;n++;}return n;}
void cb_stack_clear(CBStack*s){if(!s)return;int x;while(cb_stack_pop(s,&x)){} }
