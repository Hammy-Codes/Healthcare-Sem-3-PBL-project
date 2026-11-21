#include "linked_list.h"
#include "queue.h"
#include "stack.h"
#include "algorithms.h"
#include <assert.h>
int main(void){CBListNode*l=0;assert(!cb_list_delete(&l,1));assert(cb_list_insert(&l,3));assert(cb_list_insert(&l,1));assert(cb_list_search(l,3));int a[4];assert(cb_list_traverse(l,a,4)==2);assert(cb_list_delete(&l,1));cb_list_free(&l);assert(!l);CBQueue q;cb_queue_init(&q);int x;assert(!cb_queue_dequeue(&q,&x));assert(cb_queue_enqueue(&q,4));assert(cb_queue_peek(&q,&x)&&x==4);assert(cb_queue_dequeue(&q,&x)&&x==4);cb_queue_clear(&q);CBStack s;cb_stack_init(&s);assert(!cb_stack_pop(&s,&x));assert(cb_stack_push(&s,8));assert(cb_stack_peek(&s,&x)&&x==8);assert(cb_stack_pop(&s,&x)&&x==8);cb_stack_clear(&s);int u[]={5,1,4,2};cb_bubble_sort(u,4);assert(u[0]==1&&u[3]==5);assert(cb_binary_search_sorted(u,4,4)==2);assert(cb_linear_search(u,4,1)==0);cb_selection_sort(u,4);assert(u[0]==1);assert(cb_binary_search_sorted(0,0,1)==-1);return 0;}
